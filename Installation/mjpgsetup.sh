echo "Entering mjpg directory..."
cd mjpg

echo "getting dependencies: subversion libv4l-dev libjpeg8-dev imagemagick fswebcam..."
sudo apt-get install subversion libv4l-dev libjpeg8-dev imagemagick fswebcam

echo "Unpacking mjpg streamer code..."
unzip mjpg-streamer-code-182.zip

echo "Entering mjpg-streamer-code-182/mjpg-streamer directory..."
cd mjpg-streamer-code-182/mjpg-streamer

echo "Making and installing..."
make USE_LIBV4L2=true clean all
sudo make DESTDIR=/usr install

