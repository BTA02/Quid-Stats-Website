require 'sinatra'
require 'parse-ruby-client'
require 'json'
require 'pp'
require_relative 'raw_stats'

configure do
	puts ENV["PARSE_APP_ID"], ENV["PARSE_API_KEY"]
	Parse.init :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"]
end

get '/' do
	@all_teams = get_teams
	erb :index
end

get '/help' do
	send_file 'views/help.html'
end

get '/stats/:team_id/raw_stats' dos
	# n = RawStats.new(params[:team_id])

end



def get_teams
	Parse::Query.new("Teams").get
end




