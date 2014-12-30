require 'github/markup'
require 'redcarpet'
file=ARGV[0]
if File.size(file)>1024*512
	puts "<p>(Sorry about that, but we can't show files that are this big right now.)</p>"
	exit
end
out=Redcarpet::Markdown.new(Redcarpet::Render::HTML, no_intra_emphasis:true,autolink: true, fenced_code_blocks: true,tables: true,space_after_headers:true, superscript:true, underline:true,highlight:true,quote:true,footnotes:true).render(File.read(file))
puts out