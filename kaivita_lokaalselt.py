# KAIVITA_LOKAALSELT.PY
# Käivitab veebilehe oma arvutis, et saaks proovida ilma kodu.ut.ee serverita.
# Kasutus (projekti kaustas):  python3 kaivita_lokaalselt.py
# Siis ava brauseris: http://127.0.0.1:8000
# Kasutab ainult Pythoni standardteeki (http.server), raamistikke pole.

import os
import http.server

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "public_html"))

kasitleja = http.server.CGIHTTPRequestHandler     # oskab käivitada cgi-bin kausta Pythoni faile
kasitleja.cgi_directories = ["/cgi-bin"]

server = http.server.HTTPServer(("127.0.0.1", 8000), kasitleja)
print("Leht töötab: http://127.0.0.1:8000  (peatamiseks Ctrl+C)")
server.serve_forever()
