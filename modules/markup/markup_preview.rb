require 'github/markup'
require 'redcarpet'
code_data=$stdin.read
if code_data.bytesize>1024*512;puts "<p>(Sorry about that, but we can't show files that are this big right now.)</p>"
	exit
end
out=Redcarpet::Markdown.new(Redcarpet::Render::HTML, no_intra_emphasis:true,autolink: true, fenced_code_blocks: true,tables: true,space_after_headers:true, superscript:true, underline:true,highlight:true,quote:true,footnotes:true).render(code_data)
puts out