#! /bin/bash
# check root permissions
if [[ $UID != 0 ]]; then
  echo "Please start the script as root or sudo!"
  exit 1
fi

apt-get install bluez -y
chmod +x /home/pi/detection/ibeacon_start
chmod +x /home/pi/detection/ibeacon_stop

cat > /etc/init.d/detection << "EOF"
#!/bin/bash
### BEGIN INIT INFO
# Provides:          detection
# Required-Start:    $all
# Required-Stop:     
# Default-Start:     5
# Default-Stop:      0 1 6
# Short-Description: Fall Detection
### END INIT INFO
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:$PATH

#DESC="Fall Detection"
#PIDFILE=/var/run/detection.pid
#SCRIPTNAME=/etc/init.d/detection

case "$1" in
  start)
    sleep 60
    printf "%-50s" "Starting fall detection..."
    cd /home/pi/detection
    ./ibeacon_start
    python3 fall_detection.py &
    ;;
  stop)
    printf "%-50s" "Stopping ibeacon..."
    ./ibeacon_stop
    pkill -9 -f fall_detection.py
    ;;
  restart)
    $0 stop
    $0 start
    ;;
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
esac
EOF

cd /etc/init.d
chmod +x detection
update-rc.d -f detection defaults