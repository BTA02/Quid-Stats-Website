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
	# login screen needed here
end

get '/stats' do
	@teams = get_teams
	erb :stats
end


get '/record' do
	# the team id and vid id come thru this way
	# author id has to be a cookie
	@teams = get_teams
	erb :record_stats

end

# I use http calls in javascript for these
get '/doneGames/:team_id' do
	get_games_for_team(params[:team_id], false).sort_by{|cat| cat[:description]}.to_json
end

get '/allGames/:team_id' do
	get_games_for_team(params[:team_id], true).sort_by{|cat| cat[:description]}.to_json
end

get '/allPlayers/:team_id' do
	get_players_for_team(params[:team_id]).sort_by{|cat| cat[:description]}.to_json
end

get '/addStat/:vid_id/:team_id/:author_id/:fall_year/:player_id/:stat_name/:time/:player_in_id' do
	add_stat(params)
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
		pos_arr = [[0,1,2],[0,1,2],[0,1,2]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'quaffle_trios'
		pos_arr = [[0,1,2,3],[0,1,2,3],[0,1,2,3]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	end


end

get '/help' do
	send_file 'views/help.html'
end

def get_teams
	Parse::Query.new("Teams").get
end

def get_games_for_team(team_id, all)
	if !team_id.nil?
		if !all
			resp = Parse::Query.new("Videos").tap do |q|
				q.eq("team_id", team_id)
				q.exists("events_json")
			end.get
		else
			resp = Parse::Query.new("Videos").tap do |q|
				q.eq("team_id", team_id)
			end.get
		end
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

def get_players_for_team(team_id)
	respIds = Parse::Query.new("Rosters").tap do |q|
		q.eq("team_id", team_id)
	end.get
	ids = []
	respIds.each do |e|
		ids << e['player_id']
	end
	players = Parse::Query.new("Players").tap do |q|
		q.value_in("objectId", ids)
		q.limit = 7
	end.get
	players
end

def add_stat(params)
	pp params.to_json
end




