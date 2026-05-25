#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>

// --- CONFIGURACIÓN DE HARDWARE ---
const int SERVO_PIN = 18; // Pin de señal PWM para el servomotor
Servo exoServo;

// --- ESTADO DEL SISTEMA ---
bool deviceConnected = false;
bool safeMode = true;
int currentAngle = 0;
int currentSpeed = 5; // Velocidad lógica 1-10
int completedReps = 0;

BLECharacteristic *pTxCharacteristic;

// UUIDs deben coincidir con la app
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

void enviarNotificacion(const String &mensaje) {
  if (deviceConnected && pTxCharacteristic) {
    pTxCharacteristic->setValue(mensaje.c_str());
    pTxCharacteristic->notify();
  }
}

int delayForSpeed(int speedLevel) {
  speedLevel = constrain(speedLevel, 1, 10);
  return map(speedLevel, 1, 10, 100, 20);
}

void moverServoA(int anguloDestino, int velocidad) {
  anguloDestino = constrain(anguloDestino, 0, 180);
  int paso = anguloDestino > currentAngle ? 1 : -1;
  int retraso = delayForSpeed(velocidad);

  while (currentAngle != anguloDestino) {
    currentAngle += paso;
    exoServo.write(currentAngle);
    delay(retraso);
  }
}

void modoSeguro() {
  safeMode = true;
  moverServoA(0, currentSpeed);
  enviarNotificacion("ALERTA_PARADA");
}

void procesarComando(const String &rawCommand) {
  String comando = rawCommand;
  comando.trim();
  comando.toUpperCase();

  if (comando.length() == 0) return;

  if (comando.startsWith("VELOCIDAD:")) {
    int velocidad = comando.substring(10).toInt();
    velocidad = constrain(velocidad, 1, 10);
    currentSpeed = velocidad;
    enviarNotificacion("VELOCIDAD_OK:" + String(currentSpeed));
    return;
  }

  if (comando.startsWith("REPS:")) {
    int reps = comando.substring(5).toInt();
    if (reps > 0) {
      completedReps = reps;
      enviarNotificacion("REPS_OK:" + String(completedReps));
    }
    return;
  }

  if (comando == "EMERGENCIA") {
    modoSeguro();
    return;
  }

  if (comando == "FLEXION") {
    safeMode = false;
    moverServoA(90, currentSpeed);
    completedReps++;
    enviarNotificacion("FLEXION_OK");
    return;
  }

  if (comando == "REPOSO") {
    safeMode = false;
    moverServoA(0, currentSpeed);
    enviarNotificacion("REPOSO_OK");
    return;
  }

  enviarNotificacion("COMANDO_DESCONOCIDO");
}

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] - Celular conectado a Alma.");
    enviarNotificacion("ESP32_CONECTADO");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] - Celular desconectado. Reiniciando anuncio...");
    modoSeguro();
    pServer->getAdvertising()->start();
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    std::string rxValue = pCharacteristic->getValue();
    if (rxValue.length() == 0) return;

    String comando = String(rxValue.c_str());
    comando.trim();
    Serial.print("Comando recibido de la App: ");
    Serial.println(comando);

    procesarComando(comando);
  }
};

void setup() {
  Serial.begin(115200);

  exoServo.setPeriodHertz(50);
  exoServo.attach(SERVO_PIN, 500, 2500);
  exoServo.write(0);
  currentAngle = 0;
  safeMode = true;
  Serial.println("Motor inicializado y asegurado en 0°.");

  BLEDevice::init("EXO_UPN");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("ESP32 configurado. Buscando conexión Bluetooth...");
}

void loop() {
  delay(20);
}
