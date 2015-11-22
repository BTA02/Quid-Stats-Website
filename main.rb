require 'sinatra'
require 'parse-ruby-client'
require 'json'
require 'pp'

require_relative 'calc_stats'
require_relative 'raw_stats'

configure do
	if settings.development?
		require 'dotenv'
		# reads variables out of .env file and makes them available
		Dotenv.load
	end
	enable :sessions
	set :session_secret, 'super secret string'
	Parse.init :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"]
end

helpers do
  def get_user
  	if !session[:username].nil?
	  	"<p>"+session[:username]+"</p>"
  	else
  		"<p>Login</p>"
  	end
  end

  # ruby convention says methods that return bool should end with ?
  def logged_in?
  	# implicit return lets you clean this up a lot
  	!session[:username].nil?
  end
end

get '/' do
	if logged_in?
		@teams = get_teams
		erb :logged_in
	else
		pp 'serving'
		erb :login
	end
end

post '/sign_up' do
	sign_up_user(params)
	redirect '/'
end

post '/log_in' do
	log_in_user(params)
	redirect '/stats'
end

# ROUTES

get '/log_out' do
	session.clear
	pp 'redirecting'
	redirect '/'
end

get '/stats' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_teams
	erb :view_stats
end

get '/watch' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_teams
	erb :watch_film
end

get '/add_team' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_teams
	erb :add_team
end

get '/record' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_teams
	erb :record_stats

end

get '/add_video' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_teams
	erb :add_video_dumb
end

get '/public' do
	erb :public
end

# FUNCTION CALLS

get '/doneGames/:team_id' do
	get_games_for_team(params[:team_id], false).sort_by{|cat| cat[:description]}.to_json
end

get '/allGames/:team_id' do
	get_games_for_team(params[:team_id], true).sort_by{|cat| cat[:description]}.to_json
end

get '/allPlayers/:team_id/:fall_year' do
	get_players_for_team(params[:team_id], params[:fall_year]).sort_by{|cat| cat[:description]}.to_json
end

get '/allStats/:vid_id/:team_id' do
	get_all_stats_from_game(params[:vid_id], params[:team_id], session[:authorId]);
end

get '/addStat/:vid_id/:team_id/:fall_year/:player_id/:stat_name/:time/:player_in_id' do
	add_stat(params, session[:authorId])
end

get '/deleteStat/:object_id' do
	delete_stat(params[:object_id])
end

get '/updateStatTime/:object_id/:new_time' do
	update_stat(params)

end

get '/addVideo/:video_id/:team_id/:fall_year/:description' do
	add_video(params)
end

get '/addPlayer/:first_name/:last_name' do
	add_player(params)
end

get '/updatePlayer/:player_id/:first_name/:last_name' do
	update_player(params)
end

get '/newTeam/:team_name/:fall_year/:ids' do
	add_new_team(params)
end

get '/updateTeam/:team_id/:fall_year/:ids' do
	update_team(params)
end


# This also takes the team_id and game_ids
get '/calc_stats/:stat_selected/:per' do
	stat_selected = params[:stat_selected]
	team_id = params[:team_id]
	game_ids = params[:ids].split(",")
	calc_stats = CalcStats.new(team_id, game_ids, session[:authorId], params[:per])
	case stat_selected
	when 'raw_stats'
		raw_stats_map_json = calc_stats.raw_stats.to_json
	when 'beater_pairs'
		pos_arr = [[4,5],[4,5]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chaser_beater_beater'
		pos_arr = [[0,1,2],[4,5],[4,5]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chasers_pairs'
		pos_arr = [[0,1,2],[0,1,2]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chasers_trios'
		pos_arr = [[0,1,2],[0,1,2],[0,1,2]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'quaffle_players'
		pos_arr = [[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'full_line_up'
		pos_arr =[[0,1,2],[0,1,2],[0,1,2],[3],[4,5],[4,5]]
		stats_json = calc_stats.calc_plus_minus_stat(pos_arr).to_json
	end
end

get '/help' do
	send_file 'views/help.html'
end

def sign_up_user(params)
	#params has username and password
	user = Parse::Object.new("_User")
	user[:username] = params["email"].to_s
	user[:password] = params["pass1"].to_s
	ret_val = user.save
	session[:sessionToken] = ret_val["sessionToken"]
	session[:authorId] = ret_val["objectId"]
	session[:username] = ret_val["username"]
	ret_val.to_json
	# this should redirect to a logged in page
end

# what happenes if the password is wrong?
# hint: bad things
def log_in_user(params)
	username = params["email"].to_s
	password = params["password"].to_s
	user = Parse::User.authenticate(username, password)
	session[:sessionToken] = user["sessionToken"]
	session[:authorId] = user["objectId"]
	session[:username] = user["username"]
	user.to_json
end 

def get_teams
	Parse::Query.new("Teams").get
end


# Updated to new backend
# Needs tons of work
def get_games_for_team(team_id, all)
	if !team_id.nil?
		if !all
			# done games
			# refactor this one day
			vids = Parse::Query.new("Videos").tap do |q|
				q.eq("team_id", team_id)
			end.get
			ids = []
			vids.each do |e|
				ids.push(e['vid_id'])
			end
			catch_names = ['SNITCH_CATCH', 'AWAY_SNITCH_CATCH']
			# get all games with a snitch catch, by row in stat table
			done_games = Parse::Query.new("Stats").tap do |q|
				q.eq("team_id", team_id)
				q.value_in("vid_id", ids)
				q.eq("author_id", session[:authorId])
				q.value_in("stat_name", catch_names)
			end.get
			resp = []
			# add all videos found in both sets (by id) to a var called resp
			vids.each do |vid|
				id_of_game = vid['vid_id']
				done_games.each do |done_game|
					if done_game['vid_id'] == id_of_game
						resp.push(vid)
						break
					end
				end
			end
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
		q.limit = 1000
		q.order_by = "time"
	end.get
	resp.to_json
end

# Updated to new backend
def add_stat(params, author_id)
	new_stat = Parse::Object.new("Stats")
	new_stat['vid_id'] = params['vid_id']
	new_stat['team_id'] = params['team_id']
	new_stat['author_id'] = author_id
	new_stat['fall_year'] = params['fall_year']
	new_stat['player_id'] = params['player_id']
	new_stat['stat_name'] = params['stat_name']
	new_stat['time'] = params['time'].to_i
	new_stat['player_in_id'] = params['player_in_id']

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

def update_stat(params)
	pp 'df'
	pp params
	update_stat = Parse::Query.new('Stats').tap do |q|
		q.eq('objectid', params['object_id'])
	end.get.first
	pp update_stat
	update_stat['time'] = params['new_time']

	result = update_stat.save
	result.to_json
end

def add_video(params)
	video = params['video_id']
	team = params['team_id']
	year = params['fall_year']
	description = params['description']

	new_video = Parse::Object.new("Videos")
	new_video['team_id'] = team
	new_video['vid_id'] = video 
	new_video['fall_year'] = year
	new_video['description'] = description

	result = new_video.save
	result.to_json
end

def get_roster(params)
	resp = Parse::Query.new('Rosters').tap do |q|
		q.eq('team_id', params['team_id'])
		q.eq('fall_year', params['fall_year'])
	end.get
	resp.to_json
end

def add_player(params)
	new_player = Parse::Object.new('Players')
	new_player['first_name'] = params['first_name']
	new_player['last_name'] = params['last_name']

	result = new_player.save
	result.to_json
end

def update_player(params)
	update_player = Parse::Query.new('Players').tap do |q|
		q.eq('objectid', params['player_id'])
	end.get.first

	update_player['first_name'] = params['first_name']
	update_player['last_name'] = params['last_name']

	result = update_player.save
	result.to_json

end

def add_new_team(params)
	new_team = Parse::Object.new('Teams')
	new_team['team_name'] = params['team_name']

	result = new_team.save

	new_roster = Parse::Object.new('Rosters')
	new_roster['team_id'] = result['objectId']
	new_roster['fall_year'] = params['fall_year']
	new_roster['player_ids'] = params['ids'].split(',')
	pp 'param'


	second_result = new_roster.save

	second_result.to_json
end

def update_team(params)
	update_team = Parse::Query.new('Rosters').tap do |q|
		q.eq('team_id', params['team_id'])
		q.eq('fall_year', params['fall_year'])
	end.get.first
	pp params['ids']
	pp update_team['player_ids']
	update_team['player_ids'] = params['ids'].split(',')
	pp update_team
	result = update_team.save
	result.to_json
end












