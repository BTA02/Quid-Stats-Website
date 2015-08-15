require 'sinatra'

get '/' do
	send_file 'views/index.html'
end
