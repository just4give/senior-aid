#! /bin/bash
# check root permissions
if [[ $UID != 0 ]]; then
  echo "Please start the script as root or sudo!"
  exit 1
fi

cat > /etc/init.d/dock << "EOF"
#!/bin/bash
### BEGIN INIT INFO
# Provides:          dock
# Required-Start:    $all
# Required-Stop:     
# Default-Start:     5
# Default-Stop:      0 1 6
# Short-Description: Docking Station
### END INIT INFO
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:$PATH

#DESC="Docking Station"
#PIDFILE=/var/run/dock.pid
#SCRIPTNAME=/etc/init.d/dock

case "$1" in
  start)
    sleep 60
    printf "%-50s" "Starting docking station..."
    cd /home/pi/dock
    node scan.js &
    python3 main.py &
    ;;
  stop)
    printf "%-50s" "Stopping docking station..."
    pkill -9 -f scan.js
    pkill -9 -f main.py
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
chmod +x dock
update-rc.d -f dock defaults