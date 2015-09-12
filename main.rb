require 'sinatra'
require 'parse-ruby-client'
require 'json'
require 'pp'
require_relative 'calc_stats'
require_relative 'raw_stats'

configure do
	enable :sessions
	Parse.init :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"]
end

get '/' do
	# @all_teams = get_teams
	# erb :index
	@teams = get_teams
	erb :stats
end

get '/allStats' do
	@teams = get_teams
	erb :stats
end

get '/games/:team_id' do
	get_games_for_team(params[:team_id]).sort_by{|cat| cat[:description]}.to_json

end

# This also takes the team_id and game_ids
get '/calc_stats/:stat_selected' do
	stat_selected = params[:stat_selected]
	team_id = params[:team_id]
	game_ids = params[:ids].split(",")
	calc_stats = CalcStats.new(team_id, game_ids)
	case stat_selected
	when 'raw_stats'
		raw_stats_map_json = calc_stats.raw_stats.to_json
	when 'beater_pairs'
		pos_arr = [[4,5],[4,5]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chasers'
		pos_arr = [[0,1,2][0,1,2][0,1,2]]
		stats_json = calc_stats.calc_plus_mins_stat(pos_arr).to_json
	when 'quaffle_trios'
		pos_arr = [[0,1,2,3],[0,1,2,3],[0,1,2,3]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr)
	end


end

get '/help' do
	send_file 'views/help.html'
end

def get_teams
	Parse::Query.new("Teams").get
end

def get_games_for_team(team_id)
	if !team_id.nil?

		resp = Parse::Query.new("Videos").tap do |q|
			q.eq("team_id", team_id)
			q.exists("events_json")
		end.get
		# resp = Parse::Query.new("Videos").eq("team_id", team_id).get
		ret = []
		resp.each do |e|
			ret << {
				description: e['description'], 
				vid_id: e['vid_id'], 
				team_id: e['team_id'],	
				events: e['events_json']
			}
			# session[e['team_id']] = e['events_json']
		end
		ret
	end
end




