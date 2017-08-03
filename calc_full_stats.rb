require 'parse-ruby-client'
require 'pp'
require 'set'
require 'json'

class CalcFullStats

	attr_accessor :stats_map

	def initialize(client, team_id, game_ids, author_id, per)
		@client = client
		@team_id = team_id
		@game_ids = game_ids
		@players = get_players_from_team
		@author_id = author_id
		# per = 0 - nothing
		# per = 1 - per minute
		# per = 2 - per game
		# per = 3 - per minute per game
		@per = per.to_i
	end

	def get_stats_rows_from_games()
		array_of_game_ids_sliced = @game_ids.each_slice(5).to_a
		all_stats = []
		
		array_of_game_ids_sliced.each do |array_of_ids|
			stats_to_add = @client.query('Stats').tap do |q|
				q.eq('team_id', @team_id)
				q.eq('author_id', @author_id)
				q.value_in('vid_id', array_of_ids)
				q.order_by = "vid_id,time"
				q.limit = 1000
			end.get
			all_stats.push(stats_to_add)
		end
		all_stats.flatten!
	end
	
	def is_non_player_event?(event)
		non_player_events = ['PAUSE_CLOCK','START_CLOCK','GAME_START',
		'AWAY_GOAL','AWAY_SNITCH_CATCH','SEEKERS_RELEASED','OFFENSE',
		'OFFENSIVE_DRIVE','DEFENSE','DEFENSIVE_DRIVE','GAIN_CONTROL', 
		'LOSE_CONTROL']

		
		if non_player_events.index(event).nil?
			return false
		else
			return true
		end
	end
	
	def calc_possessions
	    rows_from_game = get_stats_rows_from_games()
	    
	    all_possessions = Array.new
	    possession = Hash.new
	    
	    # these will be reset every possession
	    drive = Hash.new
	    all_drives_on_possession = Array.new
		
	    rows_from_game.each do |row|
	        stat = row['stat_name']
	        if stat == 'OFFENSE' || stat == 'DEFENSE'
	        	if !drive.empty?
	        		all_drives_on_possession.push(drive.clone)
	        		drive.clear
	        	end
	        	if !all_drives_on_possession.empty?
	        		possession['drives'] = all_drives_on_possession.clone
	        		all_drives_on_possession.clear
	        	end
	        	if !possession.empty?
	        		all_possessions.push(possession.clone)
	        		possession.clear
	        	end
	        	possession.clear
	        	possession['offenseDefense'] = stat
	        	possession['bludger_count'] = row['bludger_count']
	        	possession['result'] = 'NO_GOAL'
	        	possession['expanded'] = false
	        	possession['objectId'] = row['objectId']
	        	
	        elsif stat == 'OFFENSIVE_DRIVE' || stat == 'DEFENSIVE_DRIVE'
				if !drive.empty?
					# store the old drive
					all_drives_on_possession.push(drive.clone)
					drive.clear
				end
				drive['bludger_count'] = row['bludger_count']
	        elsif stat == 'GOAL'
	        	if !drive.empty?
	        		drive['result'] = 'GOAL'
	        	end
	        	if !possession.empty?
	        		possession['result'] = 'GOAL'
	        	end
        	elsif stat == 'TURNOVER'
        		if !drive.empty?
	        		drive['result'] = 'TURNOVER'
	        	end
	        	if !possession.empty?
	        		possession['result'] = 'TURNOVER'
	        	end
	        elsif stat == 'AWAY_GOAL'
	        	if !drive.empty?
	        		drive['result'] = 'AWAY_GOAL'
	        	end
	        	if !possession.empty?
	        		possession['result'] = 'AWAY_GOAL'
	        	end
	        elsif stat == 'TAKEAWAY'
	        	if !drive.empty?
	        		drive['result'] = 'TAKEAWAY'
	        	end
	        	if !possession.empty?
	        		possession['result'] = 'TAKEAWAY'
	        	end
	        # elsif stat == ''
	        end
	    end
		if !drive.empty?
    		all_drives_on_possession.push(drive.clone)
    		drive.clear
		end
		if !all_drives_on_possession.empty?
    		possession['drives'] = all_drives_on_possession.clone
    		all_drives_on_possession.clear
		end
		if !possession.empty?
    		all_possessions.push(possession.clone)
    		possession.clear
		end
	   	all_possessions
	end
	
	def calc_possessions_agg
		# this might end up okay because i'll have javascript prevent anyone from calling
		# calc_possessions with more than one game, but that won't be a problem here
		# make sure i'm ready for the flip on each game in calc_possessions
		all_possessions = calc_possessions
		
		
		zero_offense_possessions = ['OFFENSE', 0]
		zero_offense_drives = ['OFFENSIVE_DRIVE', 0]
		one_offense_possessions = ['OFFENSE', 1]
		one_offense_drives = ['OFFENSIVE_DRIVE', 1]
		two_offense_possessions = ['OFFENSE', 2]
		two_offense_drives = ['OFFENSIVE_DRIVE', 2]
		
		zero_defense_possessions = ['DEFENSE', 0]
		zero_defense_drives = ['DEFENSIVE_DRIVE', 0]
		one_defense_possessions = ['DEFENSE', 1]
		one_defense_drives = ['DEFENSIVE_DRIVE', 1]
		two_defense_possessions = ['DEFENSE', 2]
		two_defense_drives = ['DEFENSIVE_DRIVE', 2]
		
		empty_vals = {
			'count' => 0,
			'goals' => 0,
			'percent' => 0
		}
		
		all_possessions_agg = {
			zero_offense_possessions => empty_vals.clone,
			one_offense_possessions => empty_vals.clone,
			two_offense_possessions => empty_vals.clone,
			zero_offense_drives => empty_vals.clone,
			one_offense_drives => empty_vals.clone,
			two_offense_drives => empty_vals.clone,
			zero_defense_possessions => empty_vals.clone,
			one_defense_possessions => empty_vals.clone,
			two_defense_possessions => empty_vals.clone,
			zero_defense_drives => empty_vals.clone,
			one_defense_drives => empty_vals.clone,
			two_defense_drives => empty_vals.clone
		}

		
		all_possessions.each do |possession|
			# get the possession data, and update the appropriate object
			# update the 'count' on the possession type
			outer_key = [possession['offenseDefense'], possession['bludger_count']]
			
			all_possessions_agg[outer_key]['count'] += 1
			if possession['result'] == 'GOAL' || possession['result'] == 'AWAY_GOAL'
				all_possessions_agg[outer_key]['goals'] += 1
			end
			
			if possession['offenseDefense'] == 'OFFENSE'
				inner_key_val_1 = 'OFFENSIVE_DRIVE'
			else
				inner_key_val_1 = 'DEFENSIVE_DRIVE'
			end
			if possession['drives'].nil?
				next
			end
			
			all_possessions_agg[outer_key]['percent'] = (all_possessions_agg[outer_key]['goals'].to_f / all_possessions_agg[outer_key]['count'].to_f).round(3) * 100
			
			possession['drives'].each do |drive|
				inner_key = [inner_key_val_1, drive['bludger_count']]
				all_possessions_agg[inner_key]['count'] += 1
				if drive['result'] == 'GOAL' || drive['result'] == 'AWAY_GOAL'
					all_possessions_agg[inner_key]['goals'] += 1
				end
				all_possessions_agg[inner_key]['percent'] = (all_possessions_agg[inner_key]['goals'].to_f / all_possessions_agg[inner_key]['count'].to_f).round(3) * 100
			end
			
		end
		all_possessions_agg
	end

	def chaser_raw_stats
		events_from_games = get_stats_rows_from_games()
		if events_from_games.nil?
			return nil
		end
		@stats_map = {}
		start_time = -1
		cur_game = "notAGame"
		on_field_array = ["chaserA", "chaserB", "chaserC", "keeper"]
		events_from_games.each do |event|
			if cur_game != event["vid_id"]
				on_field_array = ["chaserA", "chaserB", "chaserC", "keeper"]
			end
			cur_game = event["vid_id"]
			player_id = nil
			
			# pick the player to focus
			if event["stat_name"] == "SUB"
				player_id = event["player_in_id"]
			else
				player_id = event["player_id"]
			end
			
			# If the player isn't on the field, but should be, skip
			event_type = event["stat_name"]
			index1 = on_field_array.index(event["player_id"])
			if (index1 == nil && !is_non_player_event?(event_type))
				next
			end

			unless @stats_map.include?(player_id)
				if (!player_id.nil? && player_id != "null")
					first_name = '?'
					last_name = '?'
					player_index = @players.find_index { |item| 
						item['objectId'] == player_id
					}
					if !player_index.nil?
						first_name = @players[player_index]['first_name']
						last_name = @players[player_index]['last_name']
					end
					
					
					@stats_map[player_id] = {
						"first_name" => first_name,
						"last_name" => last_name,
						"shot" => 0,
						"goal" => 0,
						"assist" => 0,
						"point" => 0,
						"turnover" => 0,
						"takeaway" => 0,
						"yellow_card" => 0,
						"red_card" => 0,
						"snitch_catch" => 0,
						"plusses" => 0,
						"minuses" => 0,
						"net" => 0,
						"ratio" =>'',
						"time" => 0,
						"gain_control" => 0,
						"lose_control" => 0,
						"games_played" => Set.new
					}
				end
			end
			
			if event_type == "SUB"
				if start_time != -1
					time_to_add = event["time"] - start_time
					add_time_to_each_player(on_field_array, time_to_add, cur_game)
					start_time = event["time"]
				end
				ind = on_field_array.index(event["player_id"])
				on_field_array[ind] = player_id
			elsif event_type == "SWAP"

				if start_time != -1
					time_to_add = event["time"] - start_time
					add_time_to_each_player(on_field_array, time_to_add, cur_game)
					start_time = event["time"]
				end
				ind = on_field_array.index(event["player_id"])
				ind2 = on_field_array.index(event['player_in_id']);
				on_field_array[ind] = event["player_in_id"]
				on_field_array[ind2] = event["player_id"];
			elsif event_type == "PAUSE_CLOCK"
				if start_time != -1
					time_to_add = event["time"] - start_time
					add_time_to_each_player(on_field_array, time_to_add, cur_game)
					start_time = -1
				end
			elsif event_type == "START_CLOCK"
				start_time = event["time"]
			elsif event_type == "GAME_START"
				start_time = event["time"]
			elsif event_type == "AWAY_GOAL"
				add_plus_minus_val(on_field_array, -1)
			elsif event_type == "SEEKERS_RELEASED"
			elsif event_type == "AWAY_SNITCH_CATCH"
			
			elsif event_type == "SNITCH_CATCH"
				@stats_map[player_id]["snitch_catch"] += 1
			elsif event_type == "GOAL"
				@stats_map[player_id][event["stat_name"].downcase] += 1
				@stats_map[player_id]["shot"] += 1
				@stats_map[player_id]["point"] += 1
				add_plus_minus_val(on_field_array, 1)
			elsif event_type == "ASSIST"
				@stats_map[player_id][event["stat_name"].downcase] += 1
				@stats_map[player_id]["point"] += 1
			elsif event_type == "OFFENSE" || event_type == "DEFENSE"
			elsif event_type == "OFFENSIVE_DRIVE" || event_type == "DEFENSIVE_DRIVE"
			elsif event_type == "GAIN_CONTROL" || event_type == "LOSE_CONTROL"
				
			else
				@stats_map[player_id][event["stat_name"].downcase] += 1
			end				
		end
		@stats_map.update(@stats_map) { |key, val|
			val.update(val) { |key1, val1|
				if key1 == 'games_played'
					val1 = val['games_played'].length
				else
					val1 = val[key1]
				end
			}
		}
		if @per == 0
			return @stats_map.values
		elsif @per == 1
			@stats_map.update(@stats_map) { |key, val|
				val.update(val) { |key1, val1|
					if key1 == 'first_name'
						val1 = val['first_name']
					elsif key1 == 'last_name'
						val1 = val['last_name']
					elsif key1 == 'time'
						val1 = val['time']
					elsif key1 == 'ratio'
						val1 = val['ratio']
					elsif key1 == 'games_played'
						val1 = val['games_played']
					elsif val['time'] != 0
						val1 = val1.to_f / (val['time'].to_f / 60.0)
						val1.round(2)
					end
				}
			}
		elsif @per == 2
			@stats_map.update(@stats_map) { |key, val|
				val.update(val) { |key1, val1|
					if key1 == 'first_name'
						val1 = val['first_name']
					elsif key1 == 'last_name'
						val1 = val['last_name']
					elsif key1 == 'ratio'
						val1 = val['ratio']
					elsif key1 == 'games_played'
						val1 = val['games_played']
					elsif val['games_played'] != 0
						val1 = val1.to_f / (val['games_played'].to_f)
						if key1 == 'time'
							val1.round(0)
						else
							val1.round(2)
						end
					end
				}
				
			}
		end
		@stats_map.values
	end

	def add_plus_minus_val(on_field_array, val)
		i = 0
		while i < on_field_array.length do
			player = on_field_array[i]
			if @stats_map.include?(player)
				if val == -1
					@stats_map[player]["minuses"] += 1
					@stats_map[player]["net"] -= 1
				elsif val == 1
					@stats_map[player]["plusses"] += 1
					@stats_map[player]["net"] += 1
				end
				plus = @stats_map[player]['plusses']
				minus = @stats_map[player]['minuses']
				ratio = 0
				if minus != 0
					ratio = plus.to_f/minus.to_f
				else
					ratio = plus
				end
				@stats_map[player]['ratio'] = ratio.round(2).to_s + ':' + '1'
			end
			i+=1
		end	
	end

	def add_time_to_each_player(on_field_array, time_to_add, gameId)
		on_field_array.each do |player|
			if (@stats_map.include?(player))
				@stats_map[player]["time"] += time_to_add
				@stats_map[player]["games_played"] << gameId
			end
		end		
	end

	def calc_plus_minus_stat(arrs)

		# Gets all the events
		all_stats = get_stats_rows_from_games

		if all_stats.nil?
			return nil
		end
		all_combos = Set.new
        solutions = 1
        i = 0
        while i < arrs.length do
        	solutions *= arrs[i].length
        	i += 1
        end
        while i < solutions do
        	list = Array.new
        	j = 1
        	arrs.each do |arr|
        		list << arr[(i / j) % arr.length]
        		j *= arr.length
        	end
        	list.sort!
        	testSet = list.to_set
        	if (testSet.length == arrs.length)
        		all_combos << list
        	end
        	i += 1
        end

        combo_stat_map = Hash.new
		cur_game = "notAGame"
    	on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
    	
		start_time = -1
		start_bludger_time = -1
		have_control = false

    	all_stats.each do |event|
    		if event["vid_id"] != cur_game
    			on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
    		end
    		cur_game = event['vid_id']
    		sorted_on_field_array = sort_on_field_array_by_position(on_field_array)
    		case event['stat_name']
    		when 'GOAL'
    			all_combos.each do |combo|
    				add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'GOAL', cur_game)
    			end
    		when 'AWAY_GOAL'
    			all_combos.each do |combo|
					add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'AWAY_GOAL', cur_game)
    			end
			when 'GAIN_CONTROL'
				have_control = true
				start_bludger_time = event['time']
				all_combos.each do |combo|
					add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'GAIN_CONTROL', cur_game)
				end
				
			when 'LOSE_CONTROL'
				if start_bludger_time != -1
					bludger_time_to_add = event["time"] - start_bludger_time
					if bludger_time_to_add != 0
					all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, bludger_time_to_add, 'bludger_time', cur_game)
						end
					end
				end
				
				have_control = false
				start_bludger_time = -1
				
				all_combos.each do |combo|
					add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'LOSE_CONTROL', cur_game)
				end
    		when 'SUB'
				if start_time != -1
					time_to_add = event["time"] - start_time
					if time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time', cur_game)
						end
					end
					start_time = event["time"]
				end
				
				
				if start_bludger_time != -1
					bludger_time_to_add = event["time"] - start_bludger_time
					if bludger_time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, bludger_time_to_add, 'bludger_time', cur_game)
						end
					end
					start_bludger_time = event["time"]
				end
					
					
				ind = on_field_array.index(event['player_id'])
				on_field_array[ind] = event["player_in_id"]
			when 'SWAP'
				if start_time != -1
					time_to_add = event["time"] - start_time
					if time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time', cur_game)
						end
					end
					start_time = event["time"]
				end
				
				if start_bludger_time != -1
					bludger_time_to_add = event["time"] - start_bludger_time
					if bludger_time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, bludger_time_to_add, 'bludger_time', cur_game)
						end
					end
					start_bludger_time = event["time"]
				end
				
				ind = on_field_array.index(event['player_id'])
				ind2 = on_field_array.index(event['player_in_id'])
				on_field_array[ind] = event["player_in_id"]
				on_field_array[ind2] = event["player_id"]
				
    		when 'PAUSE_CLOCK'
				if start_time != -1
					time_to_add = event["time"] - start_time
					if time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time', cur_game)
						end
					end
					start_time = -1
				end
				
				if start_bludger_time != -1
					bludger_time_to_add = event["time"] - start_bludger_time
					if bludger_time_to_add != 0
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, bludger_time_to_add, 'bludger_time', cur_game)
						end
					end
					start_bludger_time = -1
				end
				
				
    		when 'START_CLOCK'
    			start_time = event["time"]
    			if have_control
    				start_bludger_time = event["time"]
    			end
    		when 'GAME_START'
    			start_time = event["time"]
    			if have_control
    				start_bludger_time = event["time"]
    			end
    		end
        end

        # this loop takes the combos map, and prepares it
        # for displaying
        combo_stat_map_return = Hash.new
        combo_stat_map.each { |k, v|
        	new_key = []
        	# loops through the keys values and puts
        	# names to each id
        	k.each { |id|
        		player_index = @players.find_index { |item| 	
					item['objectId'] == id
				}
				if player_index.nil?
					next
				end
				on_field_array[player_index] = id
        		if @players[player_index].nil?
        			new_key << '?'
        		else
        			new_key << @players[player_index]['first_name'] + ' ' + @players[player_index]['last_name']
        		end
        	}
        	# loop through the vals here, modding each one
        	v.update(v) { |key1, val1|
				if key1 == :games_played
        			val1 = v[key1].length
				else
					val1 = v[key1]
				end

        	}
			if @per == 1 # per minute
	        	v.update(v) { |key1, val1|
					if key1 != :time && v[:time] != 0 && key1 != :ratio && key1 != :control_percent && key1 != :games_played
	        			val1 = val1.to_f / (v[:time].to_f / 60.0)
						val1.round(2)
					else
						val1 = v[key1]
					end

	        	}
			elsif @per == 2 # per game
				v.update(v) { |key1, val1|
					if key1 != :games_played && key1 != :ratio && v[:games_played] != 0 && key1 != :control_percent
						val1 = val1.to_f / (v[:games_played].to_f)
						if key1 == :time
							val1.round(0)
						else
							val1.round(2)
						end
					else
						val1 = v[key1]
					end
				}
			end
			
        	# this is cheating, sort of
        	prettyTime = Time.at(v[:time]).utc.strftime("%M:%S")
        	if v[:time] >= 0
        		# v[:time] = prettyTime
        		combo_stat_map_return[new_key] = v
        	end
        		
        }
        combo_stat_map_return.to_a
	end

	def add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, value, category, game_id)
		cur_players = Array.new
		combo.each do |elt|
			cur_players << sorted_on_field_array[elt]
		end
		if (combo_stat_map[cur_players].nil?)
			combo_stat_map[cur_players] = {
				plusses: 0,
				minuses: 0,
				control_percent: 0,
				gain_control: 0,
				lose_control: 0,
				net: 0,
				ratio: "",
				bludger_time: 0,
				time: 0,
				games_played: Set.new
			}
		end
		case category
		when 'GOAL'
			combo_stat_map[cur_players][:plusses] += value
			combo_stat_map[cur_players][:net] += value
		when 'AWAY_GOAL'
			combo_stat_map[cur_players][:minuses] += value
			combo_stat_map[cur_players][:net] -= value
		when 'time'
			combo_stat_map[cur_players][:time] += value
			combo_stat_map[cur_players][:games_played] << game_id
			# update control percent
			if combo_stat_map[cur_players][:time] != 0
				combo_stat_map[cur_players][:control_percent] = ((combo_stat_map[cur_players][:bludger_time].to_f / combo_stat_map[cur_players][:time].to_f) * 100).round(1)
			end
		when 'bludger_time'
			combo_stat_map[cur_players][:bludger_time] += value
			# update control percent
			if combo_stat_map[cur_players][:time] != 0
				combo_stat_map[cur_players][:control_percent] = ((combo_stat_map[cur_players][:bludger_time].to_f / combo_stat_map[cur_players][:time].to_f) * 100).round(1)
			end
		when 'GAIN_CONTROL'
			combo_stat_map[cur_players][:gain_control] += value
		when 'LOSE_CONTROL'
			combo_stat_map[cur_players][:lose_control] += value
		end
		#ratio stuff
		plus = combo_stat_map[cur_players][:plusses]
		minus = combo_stat_map[cur_players][:minuses]
		ratio = 0
		if minus != 0
			ratio = plus.to_f / minus.to_f
		else
			ratio = plus
		end
		combo_stat_map[cur_players][:ratio] = ratio.round(2).to_s + ':' + '1'
	end

	def sort_on_field_array_by_position(on_field_array)
		return_array = Array.new
		chaser_array = on_field_array.take(3)
		chaser_array.sort!
		keeper_array = on_field_array[3]
		beater_array = on_field_array.drop(4).take(2)
		beater_array.sort!
		seeker_array = on_field_array[6]

		chaser_array.each { |e| return_array << e }
		return_array << keeper_array
		beater_array.each { |e| return_array << e }
		return_array << seeker_array
		return_array
	end

	def get_game_events_for_team
		@client.query("Videos").eq("team_id", @team_id).get
	end

	def getTimeFromMilliPretty(milliseconds)
		minutes = (milliseconds / 1000) / 60
		seconds = (milliseconds / 1000) % 60
		if seconds < 10
			"#{minutes}:0#{seconds}"
		else	
			"#{minutes}:#{seconds}"
		end
	end

	def get_players_from_team
		resp = @client.query("Rosters").tap do |q|
			q.eq("team_id", @team_id)
		end.get
		playersSet = Set.new
		for i in 0..resp.length-1
			players = @client.query("Players").tap do |q|
				q.value_in("objectId", resp[i]["player_ids"])
				q.order_by = "first_name"
			end.get
			playersSet.merge(players)
		end
		playersSet.to_a
	end

	def get_name_mappings
		return_mappings = {}
		@players.each do |player|
			return_mappings << {player['objectId'] => player['fname'] + " " + player['lname']}
		end
	end

	def getStatsMap
		@stats_map
	end
	
	def calc_apm
		# Gets all the events
		all_stats = get_stats_rows_from_games

		if all_stats.nil?
			return nil
		end

        # I'm going to add each stint, an array, to this table
        stint_table = Array.new
        header_stint = Array.new
        # I need to do a foreach loop on the players or something, this appends an array, not individual stuff
        header_stint.push(0, 'Plus', 'Minus', 'Time', @players).flatten!
        stint_table.push(header_stint)
        
		cur_game = "notAGame"
    	on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB"]
    	stint_time = 0;
    	stint_plus = 0;
    	stint_minus = 0;
    	
		start_time = -1
		start_bludger_time = -1
		have_control = false

    	all_stats.each do |event|
    		if event["vid_id"] != cur_game
    			if cur_game != "notAGame"
    				pp "NEW GAME"
    				add_stint_to_table(stint_plus, stint_minus, stint_time, on_field_array, stint_table)
					stint_plus = 0
					stint_minus = 0
					stint_time = 0
				end
    			on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
    		end
    		cur_game = event['vid_id']
    		sorted_on_field_array = sort_on_field_array_by_position(on_field_array)
    		case event['stat_name']
    		when 'GOAL'
    			stint_plus += 1
    		when 'AWAY_GOAL'
    			stint_minus += 1
    		when 'SUB'
    			# mark up a "stint"
				if start_time != -1
					time_to_add = event["time"] - start_time
					stint_time += time_to_add
					add_stint_to_table(stint_plus, stint_minus, stint_time, on_field_array, stint_table)
					stint_plus = 0
					stint_minus = 0
					stint_time = 0
					start_time = event["time"]
				end
				
				ind = on_field_array.index(event['player_id'])
				on_field_array[ind] = event["player_in_id"]
			when 'SWAP'
				if start_time != -1
					time_to_add = event["time"] - start_time
					stint_time += time_to_add
					start_time = event["time"]
				end
				
				ind = on_field_array.index(event['player_id'])
				ind2 = on_field_array.index(event['player_in_id'])
				on_field_array[ind] = event["player_in_id"]
				on_field_array[ind2] = event["player_id"]
				
    		when 'PAUSE_CLOCK'
				if start_time != -1
					time_to_add = event["time"] - start_time
					stint_time += time_to_add
					start_time = -1
				end
				
    		when 'START_CLOCK'
    			start_time = event["time"]
    			if have_control
    				start_bludger_time = event["time"]
    			end
    		when 'GAME_START'
    			start_time = event["time"]
    			if have_control
    				start_bludger_time = event["time"]
    			end
    		end
    	end
    	stint_table
	end
	
	def add_stint_to_table(plus, minus, time, on_field_array, stint_table)
		columns = stint_table[0].length
		# pp on_field_array
		# pp plus
		# pp minus
		# pp time
		
		new_stint = Array.new(columns, 0)
		new_stint[0] = -2
		new_stint[1] = plus
		new_stint[2] = minus
		new_stint[3] = time
		
		stint_table[0].each_with_index do |player, index|
			if index < 4
				next
			end
			
			table_id = player["objectId"]
			on_field_array.each_with_index do |on_field_player, index2|
				if index2 == 6
					next
				end
				if on_field_player == table_id
					new_stint[index] = 1
				end
			end
			stint_table.push(new_stint)
		end
	end
end
