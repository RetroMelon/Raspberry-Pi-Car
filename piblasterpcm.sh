#replace /home/pi/pi-bla.../pi-blaster with location of pi-blaster executable

echo raspberry | sudo -S ./pi-blaster/pi-blaster stop
echo raspberry | sudo -S ./pi-blaster/pi-blaster start --pcm
