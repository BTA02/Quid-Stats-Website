require 'sinatra'
require 'parse-ruby-client'
require 'json'
require 'pp'
require 'tilt/erb'

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
	def h(text)
		Rack::Utils.escape_html(text)
	end

	# ruby convention says methods that return bool should end with ?
	def logged_in?
		# implicit return lets you clean this up a lot
		!session[:username].nil?
	end
end

get '/' do
	if logged_in?
		@teams = get_all_teams
		erb :account
	else
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
	redirect '/'
end

get '/stats' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_relevant_teams
	@userId = "me"
	erb :view_stats
end

get '/watch' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_all_teams
	erb :watch_film
end

get '/add_team' do
	if !logged_in?
		redirect '/'
	end
	@all_players_array = get_all_players
	@teams = get_all_teams
	erb :add_team
end

get '/record' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_all_teams
	erb :record_stats

end

get '/add_video' do
	if !logged_in?
		redirect '/'
	end
	@teams = get_all_teams
	erb :add_video_dumb
end

get '/public/all' do
	@teams = get_all_teams
	@users = get_users
	@user_public_map = Hash.new
	build_public_teams_map(@users)
	# @public_teams_available_map
	# build_teams_available_public_map
	erb :public
end

get '/public/:userId/stats' do
	@userId = params[:userId]
	@teams = get_all_teams
	@user_public_map = Hash.new
	dummy_array = []
	dummy_array << {
		"objectId" => params[:userId]
	}
	build_public_teams_map(dummy_array)
	@teams = @user_public_map.values[0].to_a
	erb :view_stats
end

get '/public/:userId/record' do
	@teams = get_all_teams
	# erb :public_stats
end

# FUNCTION CALLS

get '/doneGames/:team_id/:user_id' do
	get_done_games_for_team(params).sort_by{|cat| cat[:description]}.to_json
end

get '/allGames/:team_id' do
	get_all_games_for_team(params).sort_by{|cat| cat[:description]}.to_json
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

get '/calcStats/:user_id/:stat_selected/:per' do
	if params[:user_id] == 'me'
		user_id = session[:authorId]
	else
		user_id = params[:user_id]
	end

	stat_selected = params[:stat_selected]
	team_id = params[:team_id]
	game_ids = params[:ids].split(",")
	# calc_stats = CalcStats.new(team_id, game_ids, session[:authorId], params[:per])
	calc_stats = CalcStats.new(team_id, game_ids, user_id, params[:per])
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

get '/videoPermissions/:team_id/:vid_id' do
	if get_video_permissions(params)
		return 'true'
	else
		return 'false'
	end
end

post '/setPermissions' do
	vals = JSON.parse(request.body.string)
	toggle_permissions(vals)
	'finished'
end

get '/help' do
	send_file 'views/help.html'
end

def sign_up_user(params)
	#params has username and password
	user = Parse::Object.new("_User")
	user[:username] = params["signupUsername"].to_s
	user[:password] = params["signupPassword1"].to_s
	ret_val = user.save
	ret_val.to_json
end

# what happenes if the password is wrong?
# hint: bad things
def log_in_user(params)
	username = params["loginUsername"].to_s
	password = params["loginPassword"].to_s
	user = Parse::User.authenticate(username, password)
	session[:sessionToken] = user["sessionToken"]
	session[:authorId] = user["objectId"]
	session[:username] = user["username"]
	user.to_json
end

def get_all_teams
	teams_array = Parse::Query.new("Teams").get
	@teams_map = Hash.new
	teams_array.each do |team|
		@teams_map[team['objectId']] = team
	end
	teams_array
end

# gets teams that I actually have stats for
# only going to be used in view stats, I think
def get_relevant_teams
	teams_array = Parse::Query.new("Teams").get
	# this gets all teams
	# now, pare this down based on what stats i actually have
	
	
	teams_array
end

def get_users
	Parse::Query.new("_User").get
end

def get_all_games_for_team(params)
	team_id = params[:team_id]

	resp = Parse::Query.new("Videos").tap do |q|
		q.eq("team_id", team_id)
	end.get
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

# This function needs re-writing
def get_done_games_for_team(params)
	team_id = params[:team_id]
	if params[:user_id] == 'me'
		user_id = session[:authorId]
	else
		user_id = params[:user_id]
	end

	vids = Parse::Query.new("Videos").tap do |q|
		q.eq("team_id", team_id)
	end.get
	ids = []
	vids.each do |e|
		ids.push(e['vid_id'])
	end
	catch_names = ['SNITCH_CATCH', 'AWAY_SNITCH_CATCH']
	done_games = Parse::Query.new("Stats").tap do |q|
		q.eq("team_id", team_id)
		q.value_in("vid_id", ids)
		q.eq("author_id", user_id)
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
	ret = []
	resp.each do |e|
		ret << {
			description: e['description'], 
			vid_id: e['vid_id'], 
			team_id: e['team_id'],	
			fall_year: e['fall_year']
		}
	end
	if params[:user_id] == 'me'
		ret
	else
		# vids = all videos for a team, period.
		# doneGames = all videos for a team that have stats for them, taken by the userId
		# I want to loop through all videos I can have (public vids)
		# and compare them to what the user in question has accomplished
		public_vids = Parse::Query.new("Permissions").tap do |q|
			q.eq('team_id', team_id)
			q.eq('author_id', user_id)
		end.get

		public_and_done_vids = []

		public_vids.each do |vid|
			id_of_game = vid['vid_id']
			done_games.each do |done_game|
				if done_game['vid_id'] == id_of_game
					public_and_done_vids.push(vid)
					break
				end
			end
		end

		final_game_set = []

		vids.each do |vid|
			id_of_game = vid['vid_id']
			public_and_done_vids.each do |done_and_public_game|
				if done_and_public_game['vid_id'] == id_of_game
					final_game_set.push(vid)
					break
				end
			end
		end

		public_and_done_vids_ret = []

		final_game_set.each do |e|
			public_and_done_vids_ret << {
				description: e['description'], 
				vid_id: e['vid_id'], 
				team_id: e['team_id'],	
				fall_year: e['fall_year']
			}
		end
		public_and_done_vids_ret
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
	stat_to_del.parse_delete
	retObj.to_json
end	

def update_stat(params)
	update_stat = Parse::Query.new('Stats').tap do |q|
		q.eq('objectid', params['object_id'])
	end.get.first
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

	second_result = new_roster.save

	second_result.to_json
end

def update_team(params)
	update_team = Parse::Query.new('Rosters').tap do |q|
		q.eq('team_id', params['team_id'])
		q.eq('fall_year', params['fall_year'])
	end.get.first
	update_team['player_ids'] = params['ids'].split(',')
	result = update_team.save
	result.to_json
end

# this needs to be re-written
# just make one call to get all the permissions from the table
# I have to do that anyway, might as well be now
def build_public_teams_map(users)
	permissions_rows = Parse::Query.new('Permissions').get
	users.each do |user|
		set_of_public_teams = Set.new
		permissions_rows.each do |permission|
			if permission['author_id'] == user['objectId']
				set_of_public_teams << @teams_map[permission['team_id']]
			end
		end
		@user_public_map[user['objectId']] = set_of_public_teams
	end
end

def get_video_permissions(params)
	permission = Parse::Query.new('Permissions').tap do |q|
		q.eq('author_id', session[:authorId])
		q.eq('team_id', params[:team_id])
		q.eq('vid_id', params[:vid_id])
	end.get

	if permission.length == 0
		false
	else
		true
	end
end

def toggle_permissions(params)
	set_to = params['privacy']

	permission = Parse::Query.new('Permissions').tap do |q|
		q.eq('author_id', session[:authorId])
		q.eq('team_id', params['team_id'])
		q.eq('vid_id', params['vid_id'])
	end.get

	if set_to
		if permission.length != 0
			# do nothing, already public
		else
			new_permission = Parse::Object.new('Permissions')
			new_permission['team_id'] = params['team_id']
			new_permission['vid_id'] = params['vid_id']
			new_permission['author_id'] = session[:authorId]
			new_permission.save
		end
	else
		permission_row = permission.first
		permission_row.parse_delete
	end
end

def get_all_players
	Parse::Query.new("Players").get
end













