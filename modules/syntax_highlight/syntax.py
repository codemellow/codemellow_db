import ntpath
import os.path
import sys
import magic

from pygments import highlight
from pygments.lexers import (guess_lexer_for_filename,get_lexer_by_name,guess_lexer)
from pygments.formatters import HtmlFormatter
if not os.path.isfile(sys.argv[1]):
	print "<p>(Sorry there's no file exist)</p>"
	sys.exit()
size = os.path.getsize(sys.argv[1])
if size>1024*512:
	print "<p>(Sorry about that, but we can't show files that are this big right now.)</p>"
	sys.exit()
f=file(sys.argv[1])
code = f.read()
m = magic.Magic(mime_encoding=True)
encoding = m.from_buffer(code) # "utf-8" "us-ascii" etc
formatter= HtmlFormatter(encoding=encoding,linenos=True,cssclass="codemellow_source")
code=code.decode(encoding)
try:
	print highlight(code, guess_lexer_for_filename(ntpath.basename(sys.argv[1]),code),formatter)
except :
	try:
		print highlight(code, guess_lexer(code), formatter)
	except :
		print highlight(code, get_lexer_by_name('text'), formatter)
