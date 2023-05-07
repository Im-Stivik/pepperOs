#upgrading from 22.04 to 23.04
#im doing it that way becuase the 23.04 installer is using snaps and it makes a mess
apt update && apt upgrade -y &&
apt install update-manager-core -y &&
sed -i 's/Prompt=lts/Prompt=normal/g' /etc/update-manager/release-upgrades &&
mv prefs/sources.list /etc/apt/
apt update && apt upgrade -y &&
apt dist-upgrade -y &&

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
apt update &&
rm /etc/systemd/system/snap* -r &&
rm /var/lib/snapd/ -r &&

#install all the extantions
unzip 'extensions/*.zip' &&
rm 'extensions/*.zip' &&
mv extensions/* /usr/share/gnome-shell/extensions/ &&

#change the gschema:
mv schemas/* /usr/share/glib-2.0/shcemas/ &&
glib-compile-schemas /usr/share/glib-2.0/schemas/ &&

#install apps and libraries
apt install libfuse2 -y
