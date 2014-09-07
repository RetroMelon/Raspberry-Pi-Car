rm mjpgstreamer.log

echo "Starting server."
mjpg_streamer -i "/usr/lib/input_uvc.so -d /dev/video0 -r 320x240" -o "/usr/lib/output_http.so -p 8091 -w /var/www/mjpg_streamer -n" &
echo "done..."
