#desnaping the system
mv prefs/nosnap.pref /etc/apt/preferences.d/ &&
add-apt-repository ppa:mozillateam/ppa &&
apt update &&
apt autoremove snapd -y &&
rm ../snap -r &&
apt install gnome-software flatpak gnome-software-plugin-flatpak -y &&
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo &&
apt install -t 'o=LP-PPA-mozillateam' firefox -y &&
echo 'Unattended-Upgrade::Allowed-Origins:: "LP-PPA-mozillateam:${distro_codename}";' | sudo tee /etc/apt/apt.conf.d/51unattended-upgrades-firefox
mv prefs/mozillappa /etc/apt/preferences.d
apt update
