require "sinatra"

get "/" do
	return "Goodbye, cruel World!"
end

get "/hello" do
	return "Hello, World!"
end