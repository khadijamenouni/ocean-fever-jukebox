import cv2
import json
import numpy as np
from datetime import datetime, timedelta

print("--- Analyse ultra-rapide de la nouvelle vidéo NASA (Courants Marins) ---")

# 1. Charger la vidéo (assure-toi qu'elle s'appelle bien video_ocean.mp4)
video_path = '../01_Data/video_ocean.mp4'
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Erreur : Impossible d'ouvrir la vidéo. Vérifie le nom et le chemin.")
    exit()

total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
duration = total_frames / fps

print(f"Vidéo chargée : {duration:.1f} secondes, {total_frames} images au total.")

# --- CONFIGURATION DES DATES (D'après la description de la NASA) ---
# Du 25 Mars 2007 au 3 Mars 2008
DATE_DEBUT = datetime(2007, 3, 25) 
DATE_FIN = datetime(2008, 3, 3)  
total_jours = (DATE_FIN - DATE_DEBUT).days

output_data = []
frame_id = 0

# ⚡ Lecture séquentielle très rapide
while True:
    ret, frame = cap.read()
    if not ret:
        break
        
    # On réduit l'image pour aller plus vite (tout en gardant les couleurs précises)
    frame_small = cv2.resize(frame, (256, 128))
    rgb_frame = cv2.cvtColor(frame_small, cv2.COLOR_BGR2RGB)
    
    # --- NETTOYAGE (FILTRAGE DES PIXELS) ---
    r = rgb_frame[:, :, 0].astype(int)
    g = rgb_frame[:, :, 1].astype(int)
    b = rgb_frame[:, :, 2].astype(int)

    # Ignorer le noir (les continents sur la nouvelle vidéo sont noirs/très sombres)
    mask_bright = (r + g + b) > 60

    # Ignorer les pixels fades (on garde les couleurs vives : rouge, jaune, bleu, vert)
    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)
    mask_colorful = (max_rgb - min_rgb) > 30

    ocean_mask = mask_bright & mask_colorful

    if np.any(ocean_mask):
        mean_red = np.mean(r[ocean_mask])
        mean_blue = np.mean(b[ocean_mask])
    else:
        mean_red = 0
        mean_blue = 0

    # La chaleur est la différence entre le rouge et le bleu
    warmth_raw = float(mean_red - mean_blue)
    
    # --- CALCUL DE LA DATE ---
    time_sec = round(frame_id / fps, 2)
    pourcentage = time_sec / duration
    jours_ecoules = int(pourcentage * total_jours)
    date_actuelle = DATE_DEBUT + timedelta(days=jours_ecoules)
    
    # Formatage : ex "25 Mar 2007"
    date_str = date_actuelle.strftime("%d %b %Y")

    output_data.append({
        "time": time_sec,
        "date": date_str, 
        "warmth_raw": round(warmth_raw, 2)
    })
    
    # Affichage de la progression
    if frame_id % 100 == 0:
        print(f"Progression : {frame_id} / {total_frames} images analysées...")
        
    frame_id += 1

cap.release()

# --- NORMALISATION (0.0 à 1.0) ---
min_warmth = min([d['warmth_raw'] for d in output_data])
max_warmth = max([d['warmth_raw'] for d in output_data])

for d in output_data:
    if max_warmth == min_warmth:
        d['normalized'] = 0.5
    else:
        d['normalized'] = round((d['warmth_raw'] - min_warmth) / (max_warmth - min_warmth), 2)

# --- EXPORTATION ---
output_path = '../01_Data/clean_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=4)

print(f"--- Succès ! {len(output_data)} jours de données générés. ---")