{pkgs}: {
  deps = [
    pkgs.gdk-pixbuf
    pkgs.pango
    pkgs.cairo
    pkgs.atk
    pkgs.gobject-introspection
    pkgs.glib
    pkgs.fontconfig
    pkgs.nss
    pkgs.chromium
    pkgs.postgresql
  ];
}
