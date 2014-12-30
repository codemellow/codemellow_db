apt-get update
echo "mysql-server-5.5 mysql-server/root_password password !rosus14" | debconf-set-selections
echo "mysql-server-5.5 mysql-server/root_password_again password !rosus14" | debconf-set-selections
apt-get install -y mysql-server
apt-get install -y openjdk-7-jre
apt-get install -y gcc
apt-get install -y g++
wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.4.0.tar.gz
tar xvzf elasticsearch-1.4.0.tar.gz
mv elasticsearch-1.4.0 elasticsearch
wget http://download.redis.io/releases/redis-2.8.17.tar.gz
tar xzf redis-2.8.17.tar.gz
cd redis-2.8.17
make