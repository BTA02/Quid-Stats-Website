require 'sinatra'
# require "sinatra/reloader" if development?
require 'parse-ruby-client'
require 'json'
require 'pp'
require 'tilt/erb'

require_relative 'calc_stats'
require_relative 'calc_full_stats'
require_relative 'raw_stats'
configure do
	if settings.development?
		require 'dotenv'
		# reads variables out of .env file and makes them available
		Dotenv.load
	end
	enable :sessions
	set :session_secret, 'super secret string'
	# Parse.init :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"]
	$client = Parse.create :application_id => ENV["PARSE_APP_ID"], :master_key => ENV["PARSE_API_KEY"], :host => 'https://parseapi.back4app.com', :path => ''
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
	
	def is_public?(author, team, vid)
		permission = $client.query('Permissions').tap do |q|
			q.eq('author_id', author)
			q.eq('team_id', team)
			q.eq('vid_id', vid)
		end.get
		if permission.length != 0
			return true
		else
			return false
		end
	end
end

get '/' do
	@title = 'Home'
	@controllerName = 'HomeController'
	if logged_in?
		@logged_in = true
		erb :login
	else
		@logged_in = false	
		erb :login
	end
end

post '/sign_up' do
	sign_up_user(params)
	redirect '/'
end

post '/log_in' do
	log_in_user(params)
	redirect '/'
end

# ROUTES

get '/log_out' do
	session.clear
	redirect '/'
end

get '/record' do
	@title = 'Take Stats'
	@controllerName = 'RecordStatsController'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :full_stats_record
end

get '/coaching' do
	@title = 'Coaching Tools'
	@controllerName = 'CoachingToolsController'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :coaching_tools
end

get '/full_stats_view' do
	@title = 'View Stats (Experimental)'
	@controllerName = 'ViewStatsControllerExp'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_relevant_teams
	@userId = 'me'
	erb :full_stats_view
end

get '/stats' do
	@title= 'View Stats'
	@controllerName = 'ViewStatsController'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_relevant_teams
	@userId = 'me'
	erb :view_stats
end

get '/add_team' do
	@title = "Add / Edit a Roster"
	@controllerName = 'AddTeamController'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :add_team
end

get '/add_video' do
	@title = 'Add Video'
	@controllerName = 'AddVideoController'
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :add_video_dumb
end

get '/public/all' do
	@title = 'Public Stats'
	@controllerName = 'PublicController'
	@teams = get_all_teams
	@users = get_users
	@user_public_map = Hash.new
	build_public_teams_map(@users)
	erb :public
end

# this will need to get updated to full_stats
get '/public/:userId/stats' do
	@controllerName = 'ViewStatsController'
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


get '/rankings' do
	@title = 'Rankings'
	@controllerName = 'RankingsController'
	erb :rankings
end

# this will need to get updated to watch_film
get '/public/:author_id/:team_id/:vid_id/:year/:player_filter/:event_filter' do
	if is_public?(params[:author_id], params[:team_id], params[:vid_id])
		@controllerName = 'RecordStatsController'
		@teams = get_all_teams
		@public = true
		@author_id = params[:author_id]
		@team_id = params[:team_id]
		@vid_id = params[:vid_id]
		@vid_year = params[:year]
		@player_id = params[:player_filter]
		@filter = params[:event_filter]
		erb :record_stats
	else
		redirect '/noAuth'
	end
end

get '/watch' do
	@title = 'Watch Game'
	@controllerName = 'WatchGameController'
	@author_id = session[:authorId]
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :WatchGame
end

get '/overlayStats' do
	@title = 'Record Stats'
	@controllerName = 'OverlayRecordStatsController'
	@author_id = session[:authorId]
	if !logged_in?
		redirect '/noAuth'
	end
	@teams = get_all_teams
	erb :OverlayRecordStats
end

get '/noAuth' do
	erb :no_auth
end

# FUNCTION CALLS

get '/doneGames/:team_id/:user_id' do
	get_done_games_for_team(params).sort_by{|cat| cat[:description]}.to_json
end

# I won't need this, in the end
get '/doneFullGames/:team_id/:user_id' do
	get_done_full_games_for_team(params).sort_by{|cat| cat[:description]}.to_json
end

get '/allGames/:team_id' do
	get_all_games_for_team(params).sort_by{|cat| cat[:description]}.to_json
end

get '/allPlayers' do 
	get_all_players.sort_by{|cat| cat[:description]}.to_json
end


get '/allPlayers/:team_id/:fall_year' do
	get_players_for_team(params[:team_id], params[:fall_year]).sort_by{|cat| cat[:description]}.to_json
end

get '/allStats/:author_id/:vid_id/:team_id' do
	get_all_stats_from_game(params[:vid_id], params[:team_id], params[:author_id])
end

get '/allStats/:vid_id/:team_id' do
	get_all_stats_from_game(params[:vid_id], params[:team_id], session[:authorId])
end

# Gets all stats from any author
get '/allStats/:vid_id' do
	get_all_stats_from_game(params[:vid_id])
end

get '/addStat/:vid_id/:team_id/:fall_year/:player_id/:stat_name/:time/:player_in_id' do
	add_stat(params, session[:authorId])
end

post '/addStat' do
	vals = JSON.parse(request.body.gets)
	add_full_stat(vals, session[:authorId])
end

# post '/setPermissions' do
# 	vals = JSON.parse(request.body.gets)
# 	toggle_permissions(vals)
# 	'finished'
# end
post '/addNote' do
	vals = JSON.parse(request.body.gets)
	add_note(vals, session[:authorId])
end

get '/allNotes/:vid_id/:team_id' do
	get_all_notes_from_game(params, session[:authorId])
end
	
# needs to be killed
get '/deleteStat/:object_id/:stat_name' do
	delete_stat(params[:object_id], params[:stat_name])
end

post '/deleteStat' do
	vals = JSON.parse(request.body.gets)
	delete_full_stat(vals)
end

# Never going to happen
get '/updateStatTime/:object_id/:new_time' do
	update_stat(params)
end

get '/addVideo/:video_id/:team_id/:opponent_id/:fall_year/:description' do
	add_video(params)
end

get '/addPlayer/:first_name/:last_name' do
	add_player(params)
end

get '/updatePlayer/:player_id/:first_name/:last_name' do
	update_player(params)
end

get '/newTeam/:team_name/:fall_year/' do
	add_new_team(params)
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
	calc_stats = CalcStats.new($client, team_id, game_ids, user_id, params[:per])
	case stat_selected
	when 'raw_stats'
		raw_stats_map_json = calc_stats.raw_stats.to_json
	when 'beater_pairs'
		pos_arr = [[4,5],[4,5]]
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

get '/calcFullStats/:user_id/:stat_selected/:per/:sop' do
	if params[:user_id] == 'me'
		user_id = session[:authorId]
	else
		user_id = params[:user_id]
	end

	stat_selected = params[:stat_selected]
	team_id = params[:team_id]
	game_ids = params[:ids].split(",")
	
	calc_full_stats = CalcFullStats.new($client, team_id, game_ids, user_id, params[:per], params[:sop])
	case stat_selected
	when 'chaser_raw_stats'
		raw_stats_map_json = calc_full_stats.chaser_raw_stats.to_json
	when 'beater_pairs'
		pos_arr = [[4,5],[4,5]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chaser_beater_beater'
		pos_arr = [[0,1,2],[4,5],[4,5]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chasers_pairs'
		pos_arr = [[0,1,2],[0,1,2]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'chasers_trios'
		pos_arr = [[0,1,2],[0,1,2],[0,1,2]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'quaffle_players'
		pos_arr = [[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'full_line_up'
		pos_arr =[[0,1,2],[0,1,2],[0,1,2],[3],[4,5],[4,5]]
		stats_json = calc_full_stats.calc_plus_minus_stat(pos_arr).to_json
	when 'possessions_agg'
		possessions_agg_json = calc_full_stats.calc_possessions_new.to_json
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
	vals = JSON.parse(request.body.gets)
	toggle_permissions(vals)
	'finished'
end

post '/saveDrawings' do
	vals = JSON.parse(request.body.gets)
	save_drawings(vals)
	'finished'
end

get '/getDrawings/:vid_id/:team_id' do
	drawingJSON = get_all_drawings_from_game(params, false)
	drawingJSON
end

get '/help' do
	send_file 'views/help.html'
end

def sign_up_user(params)
	#params has username and password
	user = $client.object("_User")
	user[:username] = params["signupUsername"].to_s
	user[:password] = params["signupPassword1"].to_s
	ret_val = user.save
	ret_val.to_json
end

# what happenes if the password is wrong?
# hint: bad things
# answer: it just takes you to a rando page
def log_in_user(params)
	username = params["loginUsername"].to_s
	password = params["loginPassword"].to_s
	user = Parse::User.authenticate(username, password, $client)
	session[:sessionToken] = user["sessionToken"]
	session[:authorId] = user["objectId"]
	session[:username] = user["username"]
	user.to_json
end

def get_all_teams
	teams_array = $client.query("Teams").tap do |q|
		q.order_by = 'team_name'
	end.get
	@teams_map = Hash.new
	teams_array.each do |team|
		@teams_map[team['objectId']] = team
	end
	teams_array
end

# gets teams that I actually have stats for
# only going to be used in view stats, I think
def get_relevant_teams
	teams_array = $client.query("Teams").tap do |q|
		q.order_by = 'team_name'
	end.get
	# this just gets all teams for now
	# now, pare this down based on what stats i actually have
	
	teams_array
end

def get_users
	$client.query("_User").get
end

def get_all_games_for_team(params)
	team_id = params[:team_id]

	resp = $client.query("Videos").tap do |q|
		q.eq("team_id", team_id)
	end.get
	ret = []	
	resp.each do |e|
		ret << {
			description: e['description'], 
			vid_id: e['vid_id'],
			team_id: e['team_id'],
			fall_year: e['fall_year'],
			opponent_id: e['opponent_id']
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

	vids = $client.query("Videos").tap do |q|
		q.eq("team_id", team_id)
	end.get
	ids = []
	vids.each do |e|
		ids.push(e['vid_id'])
	end
	catch_names = ['SNITCH_CATCH', 'AWAY_SNITCH_CATCH']
	done_games = $client.query("Stats").tap do |q|
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
		public_vids = $client.query("Permissions").tap do |q|
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

def get_players_for_team(team_id, fall_year)
	resp = $client.query("Rosters").tap do |q|
		q.eq("team_id", team_id)
		q.eq("fall_year", fall_year)
	end.get

	players = $client.query("Players").tap do |q|
		q.value_in("objectId", resp[0]["player_ids"])
		q.order_by = "first_name"
	end.get

	players
end

def get_all_stats_from_game(vid, team, author)
	resp = $client.query('Stats').tap do |q|
		q.eq("vid_id", vid)
		q.eq("team_id", team)
		q.eq("author_id", author)
		q.limit = 1000
		q.order_by = "time"
	end.get
	resp.to_json
end

def get_all_stats_from_game(vid)
	resp = $client.query('Stats').tap do |q|
		q.eq("vid_id", vid)
		q.limit = 1000
		q.order_by = "time"
	end.get
	resp.to_json
end

def get_all_notes_from_game(params, author_id)
	resp = $client.query('Notes').tap do |q|
		q.eq("vid_id", params[:vid_id])
		q.eq("team_id", params[:team_id])
		q.eq("author_id", author_id)
		q.limit = 1000
		q.order_by = "time"
	end.get
	resp.to_json
end

def add_stat(params, author_id)
	new_stat = $client.object('Stats')
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

def add_note(params, author_id)
	new_stat = $client.object("Notes")
	new_stat['vid_id'] = params['vid_id']
	new_stat['team_id'] = params['team_id']
	new_stat['author_id'] = author_id
	new_stat['fall_year'] = params['fall_year']
	new_stat['time'] = params['time'].to_i
	
	
	new_stat['good_bad_filter'] = params['good_bad_filter']
	new_stat['o_d_filter'] = params['o_d_filter']
	
	new_stat['note'] = params['note']

	result = new_stat.save
	result.to_json
end

def delete_stat(id, stat_name)
	if stat_name == 'NOTE'
		stat_to_del = $client.query('Notes').tap do |q|
			q.eq("objectId", id);
		end.get.first
		retObj = stat_to_del.clone
		stat_to_del.parse_delete
		retObj.to_json
	else
		stat_to_del = $client.query('Stats').tap do |q|
			q.eq("objectId", id);
		end.get.first
		retObj = stat_to_del.clone
		stat_to_del.parse_delete
		retObj.to_json
	end
end

def update_stat(params)
	update_stat = $client.query('Stats').tap do |q|
		q.eq('objectid', params['object_id'])
	end.get.first
	update_stat['time'] = params['new_time']

	result = update_stat.save
	result.to_json
end

def add_video(params)
	video = params['video_id']
	team = params['team_id']
	opponent_id = params['opponent_id']
	year = params['fall_year']
	description = params['description']

	new_video = $client.object("Videos")
	new_video['team_id'] = team
	new_video['opponent_id'] = opponent_id
	new_video['vid_id'] = video 
	new_video['fall_year'] = year
	new_video['description'] = description

	result = new_video.save
	result.to_json
end

def get_roster(params)
	resp = $client.query('Rosters').tap do |q|
		q.eq('team_id', params['team_id'])
		q.eq('fall_year', params['fall_year'])
	end.get
	resp.to_json
end

def add_player(params)
	new_player = $client.object('Players')
	new_player['first_name'] = params['first_name']
	new_player['last_name'] = params['last_name']

	result = new_player.save
	result.to_json
end

def update_player(params)
	update_player = $client.query('Players').tap do |q|
		q.eq('objectid', params['player_id'])
	end.get.first

	update_player['first_name'] = params['first_name']
	update_player['last_name'] = params['last_name']

	result = update_player.save
	result.to_json

end

def add_new_team(params)
	new_team = $client.object('Teams')
	new_team['team_name'] = params['team_name']

	result = new_team.save

	new_roster = $client.object('Rosters')
	new_roster['team_id'] = result['objectId']
	new_roster['fall_year'] = params['fall_year']
	new_roster['player_ids'] = nil
	if params['ids']
		new_roster['player_ids'] = params['ids'].split(',')
	end
	second_result = new_roster.save

	second_result.to_json
end

def update_team(params)
	update_team = $client.query('Rosters').tap do |q|
		q.eq('team_id', params['team_id'])
		q.eq('fall_year', params['fall_year'])
	end.get.first
	if update_team == nil
		new_roster = $client.object('Rosters')
		new_roster['team_id'] = params['team_id']
		new_roster['fall_year'] = params['fall_year']
		new_roster['player_ids'] = params['ids'].split(',')
		result = new_roster.save
		result.to_json
	else
		update_team['player_ids'] = params['ids'].split(',')
		result = update_team.save
		result.to_json
	end
end

# this needs to be re-written
# just make one call to get all the permissions from the table
# I have to do that anyway, might as well be now
def build_public_teams_map(users)
	permissions_rows = $client.query('Permissions').get
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
	permission = $client.query('Permissions').tap do |q|
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

	permission = $client.query('Permissions').tap do |q|
		q.eq('author_id', session[:authorId])
		q.eq('team_id', params['team_id'])
		q.eq('vid_id', params['vid_id'])
	end.get

	if set_to
		if permission.length != 0
			# do nothing, already public
		else
			new_permission = $client.object('Permissions')
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

def save_drawings(params)
	existing_drawings = get_all_drawings_from_game(params, true)
	if existing_drawings.nil? or existing_drawings.empty?
		new_drawing = $client.object('Drawings')
		new_drawing['team_id'] = params['team_id']
		new_drawing['vid_id'] = params['vid_id']
		new_drawing['author_id'] = session[:authorId]
		new_drawing['xMap'] = params['clickXMap']
		new_drawing['yMap'] = params['clickYMap']
		new_drawing['dragMap'] = params['clickDragMap']
		new_drawing.save
	else
		existing_drawings['xMap'] = params['clickXMap']
		existing_drawings['yMap'] = params['clickYMap']
		existing_drawings['dragMap'] = params['clickDragMap']
		existing_drawings.save
	end
end

def get_all_drawings_from_game(params, getRawObject)
	drawings = $client.query("Drawings").tap do |q|
		q.eq('author_id', session[:authorId])
		q.eq('team_id', params['team_id'])
		q.eq('vid_id', params['vid_id'])
	end.get.first
	if(getRawObject)
		drawings
	else
		drawings.to_json
	end
end

# to make this better, just wait until a few letters have been typed
# then look it all up
def get_all_players
	$client.query("Players").tap do |q|
		q.limit = 1000
	end.get
end






# New stuff

def add_full_stat(vals, author_id)
	new_stat = $client.object('Stats')
	new_stat['vid_id'] = vals['vid_id']
	new_stat['team_id'] = vals['team_id']
	new_stat['author_id'] = author_id
	new_stat['fall_year'] = vals['year']
	new_stat['player_id'] = vals['player_id']
	new_stat['stat_name'] = vals['stat']
	new_stat['time'] = vals['time'].to_i
	new_stat['player_in_id'] = vals['player_in_id']

	result = new_stat.save
	result.to_json
end

def delete_full_stat(vals)
	if vals['stat'] == 'NOTE'
		stat_to_del = $client.query('Notes').tap do |q|
			q.eq("objectId", vals['object_id']);
		end.get.first
		retObj = stat_to_del.clone
		stat_to_del.parse_delete
		retObj.to_json
	else
		stat_to_del = $client.query('Stats').tap do |q|
			q.eq("objectId", vals['object_id']);
		end.get.first
		retObj = stat_to_del.clone
		stat_to_del.parse_delete
		retObj.to_json
	end
end















