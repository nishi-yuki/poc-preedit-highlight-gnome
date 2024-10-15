.PHONY: all install run

all: preedit-highlight@nishi-yuki.github.com.shell-extension.zip

preedit-highlight@nishi-yuki.github.com.shell-extension.zip: metadata.json extension.js
	gnome-extensions pack --force

install: preedit-highlight@nishi-yuki.github.com.shell-extension.zip
	gnome-extensions install --force preedit-highlight@nishi-yuki.github.com.shell-extension.zip

run: install
	MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768 dbus-run-session -- gnome-shell --nested --wayland
