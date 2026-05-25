import json
import random
import subprocess
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras import Sequential
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import Dense, Dropout

ROOT = Path(__file__).parent
DATASET_PATH = ROOT / "dataset_clinico.csv"
AUGMENTED_DATASET_PATH = ROOT / "dataset_clinico_augmented.csv"
MODEL_DIR = ROOT / "Alma" / "www" / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_H5_PATH = MODEL_DIR / "alma_nlp_model.h5"
MODEL_WEIGHTS_PATH = MODEL_DIR / "model_weights.json"
VECTORIZER_PATH = MODEL_DIR / "vectorizer_vocab.json"
LABEL_MAP_PATH = MODEL_DIR / "label_map.json"
TRAINING_INFO_PATH = MODEL_DIR / "training_info.json"
TFJS_MODEL_DIR = MODEL_DIR / "tfjs_model"

SYNONYMS = {
    'detente': ['para', 'alto', 'detenlo'],
    'ahora': ['ya', 'inmediatamente'],
    'alto': ['para', 'detente'],
    'inmediatamente': ['ahora', 'pronto'],
    'dolor': ['molestia', 'malestar'],
    'flexion': ['flexion', 'contraccion'],
    'repeticion': ['repeticiones', 'movimiento'],
    'dobla': ['gira', 'flexiona'],
    'descansa': ['pausa', 'relajate'],
    'pausa': ['descanso', 'alto'],
    'progreso': ['avance', 'historial'],
    'sesiones': ['sesion', 'entrenamientos'],
    'estadisticas': ['datos', 'resultados'],
    'ajustes': ['configuracion', 'opciones'],
    'personaliza': ['configura', 'modifica'],
    'objetivo': ['meta', 'meta de repeticiones'],
    'velocidad': ['ritmo', 'rapidez'],
    'lento': ['suave', 'despacio'],
    'rapido': ['rapido', 'veloz'],
    'finalizar': ['terminar', 'acabar'],
    'sesion': ['sesion', 'entrenamiento']
}


def normalize_text(text):
    normalized = unicodedata.normalize('NFD', str(text).lower())
    cleaned = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
    return cleaned.strip()


def generate_variations(phrase, max_variants=3):
    phrase = normalize_text(phrase)
    tokens = phrase.split()
    variants = set([phrase])

    for _ in range(max_variants):
        new_tokens = []
        for token in tokens:
            clean_token = ''.join([c for c in token if c.isalpha() or c == 'ñ' or c == 'á' or c == 'é' or c == 'í' or c == 'ó' or c == 'ú'])
            if clean_token in SYNONYMS and random.random() < 0.55:
                replacement = random.choice(SYNONYMS[clean_token])
                new_tokens.append(replacement)
            else:
                new_tokens.append(token)

        variant = ' '.join(new_tokens)
        variants.add(variant)

    return list(variants)


def build_augmented_dataset(dataset_path):
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    df = pd.read_csv(dataset_path)
    augmented_rows = []

    for _, row in df.iterrows():
        phrase = str(row['phrase']).strip()
        label = row['label'].strip()
        augmented_rows.append({'phrase': phrase, 'label': label})

        for variation in generate_variations(phrase, max_variants=4):
            cleaned = normalize_text(variation)
            if cleaned != phrase:
                augmented_rows.append({'phrase': cleaned, 'label': label})

    augmented_df = pd.DataFrame(augmented_rows).drop_duplicates().reset_index(drop=True)
    augmented_df.to_csv(AUGMENTED_DATASET_PATH, index=False)
    return augmented_df


def create_model(input_dim, output_dim):
    model = Sequential([
        Dense(128, activation='relu', input_shape=(input_dim,)),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dropout(0.25),
        Dense(output_dim, activation='softmax')
    ])
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def save_json(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def convert_model_to_tfjs(keras_model_path, tfjs_output_dir):
    try:
        import numpy as np
        if not hasattr(np, 'object'):
            np.object = object
        if not hasattr(np, 'bool'):
            np.bool = bool

        from tensorflowjs.converters import converter as tfjs_converter
        print(f"Convirtiendo modelo Keras a TensorFlow.js en {tfjs_output_dir}")
        tfjs_converter.convert(
            keras_model_path=str(keras_model_path),
            output_dir=str(tfjs_output_dir),
            input_format='keras'
        )
        print('Conversión a TFJS completada')
    except Exception as exc:
        print('No se pudo convertir el modelo a TensorFlow.js (opcional):', exc)


def export_model_weights_json(model, output_path):
    layers = []
    for layer in model.layers:
        weights = layer.get_weights()
        if len(weights) == 2:
            w, b = weights
            layers.append({
                'weights': w.tolist(),
                'biases': b.tolist(),
                'activation': layer.activation.__name__ if hasattr(layer, 'activation') else 'linear'
            })

    data = {
        'layers': layers
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    print('Cargando dataset clinico base...')
    df = build_augmented_dataset(DATASET_PATH)
    print(f'Dataset aumentado: {len(df)} ejemplos generados')

    vectorizer = CountVectorizer(preprocessor=normalize_text, lowercase=False, token_pattern=r'(?u)\b\w+\b')
    X = vectorizer.fit_transform(df['phrase'].astype(str)).toarray()

    encoder = LabelEncoder()
    y = encoder.fit_transform(df['label'].astype(str))

    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size=0.20,
        stratify=y,
        random_state=42
    )

    print('Construyendo modelo neuronal...')
    model = create_model(X.shape[1], len(encoder.classes_))
    model.summary()

    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=6,
        restore_best_weights=True,
        verbose=1
    )

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=50,
        batch_size=16,
        callbacks=[early_stop],
        verbose=2
    )

    loss, accuracy = model.evaluate(X_val, y_val, verbose=0)
    print(f'Evaluacion final - loss: {loss:.4f}, accuracy: {accuracy:.4f}')

    print(f'Guardando modelo H5 en {MODEL_H5_PATH}')
    model.save(MODEL_H5_PATH)

    save_json(vectorizer.vocabulary_, VECTORIZER_PATH)
    save_json({label: int(index) for index, label in enumerate(encoder.classes_)}, LABEL_MAP_PATH)

    save_json({
        'input_dim': X.shape[1],
        'classes': list(encoder.classes_),
        'num_examples': len(df),
        'validation_accuracy': float(accuracy),
        'train_size': int(X_train.shape[0]),
        'val_size': int(X_val.shape[0])
    }, TRAINING_INFO_PATH)

    export_model_weights_json(model, MODEL_WEIGHTS_PATH)
    convert_model_to_tfjs(MODEL_H5_PATH, TFJS_MODEL_DIR)

    print('Entrenamiento completado. Modelo guardado en Alma/www/model/alma_nlp_model.h5 y pesos exportados en Alma/www/model/model_weights.json')


if __name__ == '__main__':
    main()
