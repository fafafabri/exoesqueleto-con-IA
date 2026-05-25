# Instrucciones para entrenar más el modelo de IA

Este documento explica cómo agregar nuevas frases al entrenamiento, ejecutar el script de entrenamiento y guardar los resultados en Git.

## 1. Agregar datos al conjunto de entrenamiento

El archivo principal de datos es:

- `dataset_clinico.csv`

Cada fila debe tener al menos estas dos columnas:

- `phrase` → frase o comando que dice el usuario
- `label` → etiqueta de intención agrupada

Ejemplo de filas nuevas:

```csv
phrase,label
"haz una flexión lenta",FLEXION
"detente ahora mismo",EMERGENCIA
"reposa un momento",REPOSO
"aumenta la velocidad",VELOCIDAD
```

### Recomendaciones para mejorar el entrenamiento

- Añade muchas variaciones naturales de cada comando.
- Incluye sinónimos, formas cortas y frases completas.
- Asegúrate de tener ejemplos balanceados para todas las clases.
- No uses mayúsculas o acentos inconsistentes; el preprocesamiento normaliza el texto.

## 2. Ejecutar el entrenamiento

Una vez que agregues datos en `dataset_clinico.csv`, ejecuta el script:

```powershell
cd "C:\Users\HP\Desktop\exoesqueleto-con-IA"
"C:\Program Files\Python313\python.exe" -u train_nlp_model.py
```

Si tu `python` ya está disponible en la terminal, puedes usar:

```powershell
cd "C:\Users\HP\Desktop\exoesqueleto-con-IA"
python -u train_nlp_model.py
```

### Qué genera el script

Después de ejecutarlo, el script actualizará o creará estos archivos:

- `Alma/www/model/alma_nlp_model.h5`
- `Alma/www/model/model_weights.json`
- `Alma/www/model/vectorizer_vocab.json`
- `Alma/www/model/label_map.json`
- `Alma/www/model/training_info.json`

## 3. Ver qué se incorporó al archivo de entrenamiento

Para verificar los datos agregados en el conjunto de entrenamiento, abre `dataset_clinico.csv` con un editor o con un comando como:

```powershell
Get-Content .\dataset_clinico.csv | Select-Object -First 20
```

Si quieres ver solo las nuevas filas al final:

```powershell
Get-Content .\dataset_clinico.csv | Select-Object -Last 20
```

O usando CSV directo:

```powershell
Import-Csv .\dataset_clinico.csv | Select-Object -Last 20
```

## 4. Guardar los cambios en Git

Después de entrenar y comprobar los archivos, guarda todo en el repositorio:

```powershell
cd "C:\Users\HP\Desktop\exoesqueleto-con-IA"
git add dataset_clinico.csv Alma/www/model/model_weights.json Alma/www/model/vectorizer_vocab.json Alma/www/model/label_map.json Alma/www/model/training_info.json
git commit -m "Actualizar entrenamiento NLP: nuevos datos y modelo entrenado"
git push origin main
```

> Si no quieres subir el modelo `.h5` al repositorio, deja solo los archivos JSON y el dataset. El archivo `model_weights.json` es suficiente para la inferencia local en el navegador.

## 5. Consejos finales

- Entrenar más no siempre significa mejores resultados si los datos no son buenos.
- Lo mejor es agregar ejemplos reales de uso y frases parecidas a las que dirán los pacientes.
- Mantén el dataset limpio y sin duplicados muy similares.
- Si quieres, agrega nuevas etiquetas cuando necesites más intenciones, pero también actualiza el código de `Alma/www/nlp.js` para reconocerlas.
