@echo off
echo Opening ports 5254 (Frontend) and 8080 (Backend) in Windows Firewall...
netsh advfirewall firewall add rule name="EPRKAVACH Frontend" dir=in action=allow protocol=TCP localport=5254
netsh advfirewall firewall add rule name="EPRKAVACH Backend" dir=in action=allow protocol=TCP localport=8080
echo Done! You should now be able to access the app from your phone.
pause
