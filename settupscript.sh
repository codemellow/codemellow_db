apt-get update
apt-get install -y gcc
apt-get install -y g++
apt-get install -y make
wget http://nodejs.org/dist/v0.10.33/node-v0.10.33.tar.gz
tar xvzf node-v0.10.33.tar.gz
cd node-v0.10.33
make
make install
apt-get install -y npm
apt-get install -y git
apt-get install -y python
apt-get install -y python-pip
apt-get install -y ruby1.9.3
ln -sf /usr/bin/ruby1.9.3 /usr/bin/ruby
apt-get install -y rubygems
gem install rubygems-update
update_rubygems
apt-get install -y mysql-client
cd -
git clone git@git.codemellow.net:cmreposerver.git ./reposerver
cd reposerver
npm install -g express
npm install -g forever
#update-alternatives --config ruby
#update-alternatives --config gem

gem install redcarpet
gem install RedCloth
gem install rdoc -v 3.6.1
gem install org-ruby
gem install creole
gem install wikicloth
easy_install docutils
gem install asciidoctor
gem install github-markup

pip install pygments
pip install python-magic 
export NODE_ENV='pro'