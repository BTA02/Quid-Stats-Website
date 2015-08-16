require 'sinatra'
require 'parse-ruby-client'
require 'json'

configure do
	puts ENV["PARSE_APP_ID"], ENV["PARSE_API_KEY"]
	Parse.init :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"]
end

get '/' do
	send_file 'views/index.html'

end

get '/help' do
	send_file 'views/help.html'
end

get '/stats/:team_id' do
	get_game_events_for_team(params[:team_id]).to_json
end

def get_game_events_for_team(team_id)
	Parse::Query.new("Videos").eq("team_id", team_id).get

end
