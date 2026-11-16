#!/bin/sh
# Arma el video "sprite" de Proyectos destacados: una grilla 5×2 de recortes de 384×540
# (1920×1080 en total) en bucle de ida y vuelta: cada clip avanza 6 s y retrocede al punto
# de partida (≈12 s), así se ve continuo, sin cortes ni fundidos. Más una versión de 1280×720
# para el celular y el póster (primer cuadro). Requiere ffmpeg.
# Uso (desde la carpeta web_impeccable):  sh herramientas/armar-sprite-destacados.sh
# Para cambiar un clip, editá la lista de abajo (orden = tarjetas 1 a 10) y su segundo de inicio.
set -eu
B=uploads/web
O=uploads/destacados
mkdir -p "$O"

# archivo                                                       inicio (s)
set -- \
  "$B/toyota-hilux/toyota-hilux-video-01.mp4"                    7 \
  "$B/peugeot-208-linea-vieja/peugeot-208-linea-vieja-video-01.mp4" 0 \
  "$B/vw-t-cross/vw-t-cross-video-01.mp4"                        15 \
  "$B/ford-ranger/ford-ranger-video-02.mp4"                      4 \
  "$B/ford-focus/ford-focus-foto-01-1920.jpg"                    0 \
  "$B/peugeot-partner-linea-nueva/peugeot-partner-linea-nueva-video-01.mp4" 0 \
  "$B/gol-power/gol-power-video-01.mp4"                          0 \
  "$B/toyota-hilux/toyota-hilux-video-02.mp4"                    0 \
  "$B/fiat-fiorino-linea-nueva/fiat-fiorino-linea-nueva-video-01.mp4" 0 \
  "$B/peugeot-208-linea-vieja/peugeot-208-linea-vieja-video-02.mp4" 3

INPUTS=""
FILTER=""
i=0
while [ $# -gt 0 ]; do
  f=$1; ss=$2; shift 2
  case "$f" in
    *.jpg|*.webp)
      # Foto (sin video): acercamiento lento de 6 s
      INPUTS="$INPUTS -i $f"
      FILTER="$FILTER[$i:v]crop=iw:trunc(iw*540/384/2)*2:0:(ih-oh)/2,scale=1152:1620,zoompan=z='1+0.0006*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=180:s=384x540:fps=30,setsar=1,trim=end_frame=180,setpts=PTS-STARTPTS,split[f$i][b$i];"
      ;;
    *)
      INPUTS="$INPUTS -ss $ss -t 6 -i $f"
      FILTER="$FILTER[$i:v]crop=iw:trunc(iw*540/384/2)*2:0:(ih-oh)/2,scale=384:540,fps=30,setsar=1,trim=end_frame=180,setpts=PTS-STARTPTS,split[f$i][b$i];"
      ;;
  esac
  # Ida y vuelta: el tramo al revés sin repetir el primer ni el último cuadro
  FILTER="$FILTER[b$i]reverse,trim=start_frame=1:end_frame=179,setpts=PTS-STARTPTS[r$i];[f$i][r$i]concat=n=2:v=1:a=0[t$i];"
  i=$((i + 1))
done

# Grilla 5×2
FILTER="$FILTER[t0][t1][t2][t3][t4][t5][t6][t7][t8][t9]xstack=inputs=10:layout=0_0|384_0|768_0|1152_0|1536_0|0_540|384_540|768_540|1152_540|1536_540,format=yuv420p,split[a][b];[b]scale=1280:720[s]"

# shellcheck disable=SC2086
ffmpeg -hide_banner -y $INPUTS -filter_complex "$FILTER" \
  -map "[a]" -an -c:v libx264 -profile:v high -preset slow -crf 27 -g 60 -pix_fmt yuv420p -movflags +faststart "$O/destacados-sprite-1920.mp4" \
  -map "[s]" -an -c:v libx264 -profile:v high -preset slow -crf 28 -g 60 -pix_fmt yuv420p -movflags +faststart "$O/destacados-sprite-1280.mp4"

ffmpeg -hide_banner -y -i "$O/destacados-sprite-1920.mp4" -frames:v 1 -c:v libwebp -quality 78 "$O/destacados-sprite-poster.webp"
ls -la "$O"
