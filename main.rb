require 'sinatra'
require 'parse-ruby-client'
require 'json'
require 'pp'
require_relative 'calc_stats'
require_relative 'raw_stats'

configure do
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
	when "raw_stats"
		raw_stats_map_json = r.raw_stats.to_json
		# return a json for javascript to fuq with
	end


end

get '/help' do
	send_file 'views/help.html'
end

get '/stats/:team_id/raw_stats' do
	@r = RawStats.new(params[:team_id], params[:game_ids])
	@raw_stats_map = @r.calcMap
	@players_from_team = @r.getPlayersFromTeam
	#calculate out the totals....
	@totals= {
		"shot" => 0,
		"goal" => 0,
		"assist" => 0,
		"turnover" => 0,
		"takeaway" => 0,
		"yellow_card" => 0,
		"red_card" => 0,
		"snitch_catch" => 0,
		"plusses" => 0,
		"minuses" => 0,
		"time" => 0,
		"gain_control" => 0,
		"lose_control" => 0
	}
	@raw_stats_map.each do |k,v|
		v.each do |ik, iv|
			@totals[ik] += iv
		end
	end
	pp @totals
	erb :raw_stats
end

def get_teams
	Parse::Query.new("Teams").get
end

def get_games_for_team(team_id)
	if !team_id.nil?
		resp = Parse::Query.new("Videos").eq("team_id", team_id).get
		resp.map do |e| 
			{
				description: e['description'], 
				vid_id: e['vid_id'], 
				team_id: e['team_id'],
				events: e['events_json']
			}
		end
	end
end




