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

get '/allPlayers/:team_id/:fall_year' do
	get_players_for_team(params[:team_id], params[:fall_year]).sort_by{|cat| cat[:description]}.to_json
end

get '/allStats/:vid_id/:team_id/:author_id' do
	get_all_stats_from_game(params[:vid_id], params[:team_id], params[:author_id]);
end

get '/addStat/:vid_id/:team_id/:author_id/:fall_year/:player_id/:stat_name/:time/:player_in_id' do
	add_stat(params)
end

get '/deleteStat/:object_id' do
	delete_stat(params[:object_id])
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

# Needs work, look at the first part of the if
# This should only return "done games", whatever that means

def get_games_for_team(team_id, all)
	if !team_id.nil?
		if !all
			resp = Parse::Query.new("Videos").tap do |q|
				q.eq("team_id", team_id)
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
				fall_year: e['fall_year']
			}
		end
		ret
	end
end

# Updated to new backend
def get_players_for_team(team_id, fall_year)
	resp = Parse::Query.new("Rosters").tap do |q|
		q.eq("team_id", team_id)
		q.eq("fall_year", fall_year)
	end.get

	players = Parse::Query.new("Players").tap do |q|
		q.value_in("objectId", resp[0]["player_ids"])
		q.order_by = "first_name"
	end.get

	players
end

# Updated to new backend
def get_all_stats_from_game(vid, team, author)
	resp = Parse::Query.new("Stats").tap do |q|
		q.eq("vid_id", vid)
		q.eq("team_id", team)
		q.eq("author_id", author)
		q.order_by = "time"
	end.get
	resp.to_json
end

# Updated to new backend
def add_stat(params)
	new_stat = Parse::Object.new("Stats");
	new_stat['vid_id'] = params['vid_id'];
	new_stat['team_id'] = params['team_id'];
	new_stat['author_id'] = params['author_id'];
	new_stat['fall_year'] = params['fall_year'];
	new_stat['player_id'] = params['player_id'];
	new_stat['stat_name'] = params['stat_name'];
	new_stat['time'] = params['time'].to_i;
	new_stat['player_in_id'] = params['player_in_id'];

	result = new_stat.save
	result.to_json
end

def delete_stat(id)
	stat_to_del = Parse::Query.new("Stats").tap do |q|
		q.eq("objectId", id);
	end.get.first
	retObj = stat_to_del.clone
	resp = stat_to_del.parse_delete
	retObj.to_json

end	













