require 'parse-ruby-client'
require 'pp'
require 'set'

class CalcStats

	attr_accessor :stats_map

	def initialize(team_id, game_ids)
		@team_id = team_id
		@game_ids = game_ids
		@players = get_players_from_team
		# @name_mappings = get_name_mappings
	end

	def raw_stats
		video_table_rows = Parse::Query.new("Videos").tap do |q|
			q.eq('team_id', @team_id)
			q.value_in('vid_id', @game_ids)
		end.get
		events_map = {}
		video_table_rows.each do |row|
			events_map[row['vid_id']] = JSON.parse(row['events_json'])
		end
		@stats_map = {}
		on_field_array = ["a", "b", "c", "d", "e", "f", "g"]
		start_time = -1
		@game_ids.each do |game|
			# next if game["events_json"].nil?
			# events_from_game = JSON.parse(game["events_json"])
			# pp events_from_game
			events_from_game = events_map[game]
			next if events_from_game.nil?
			events_from_game.each do |event|
				player_id = nil
				if event["playerOut"] != ""
					player_id = event["playerOut"]
				elsif event["playerIn"] != ""
					player_id = event["playerIn"]
				end
				unless @stats_map.include?(player_id)
					if (!player_id.nil?)
						first_name = '?'
						last_name = '?'
						if !@players[player_id].nil?
							first_name = @players[player_id][:first_name]
							last_name = @players[player_id][:last_name]
						end
						@stats_map[player_id] = {
							"first_name" => first_name,
							"last_name" => last_name,
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
							"net" => 0,
							"time" => 0
							# "gain_control" => 0,
							# "lose_control" => 0
						}
					end
				end

				event_type = event["actualAction"]

				if event_type == "SUB"
					if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						add_time_to_each_player(on_field_array, time_to_add)
						start_time = event["youtubeTime"]
					end
					on_field_array[event["loc"]] = player_id
				elsif event_type == "PAUSE_CLOCK"
					if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						add_time_to_each_player(on_field_array, time_to_add)
						start_time = -1
					end
				elsif event_type == "START_CLOCK"
					start_time = event["youtubeTime"]
				elsif event_type == "GAME_START"
					start_time = event["youtubeTime"]
				elsif event_type == "AWAY_GOAL"
					add_plus_minus_val(on_field_array, -1)
				elsif event_type == "SNITCH_ON_PITCH"
				elsif event_type == "AWAY_SNITCH_CATCH"
				
				elsif event_type == "SNITCH_CATCH"
					@stats_map[player_id]["snitch_catch"] += 1
				elsif event_type == "GOAL"
					@stats_map[player_id][event["actualAction"].downcase] += 1
					@stats_map[player_id]["shot"] += 1
					add_plus_minus_val(on_field_array, 1)
				else
					@stats_map[player_id][event["actualAction"].downcase] += 1
				end
								
			end
		end
		# sort it here
		@stats_map
	end

	def add_plus_minus_val(on_field_array, val)
		i = 0
		while i < on_field_array.length - 1 do
			player = on_field_array[i]
			if @stats_map.include?(player)
				if val == -1
					@stats_map[player]["minuses"] += 1
					@stats_map[player]["net"] -= 1
				elsif val == 1
					@stats_map[player]["plusses"] += 1
					@stats_map[player]["net"] += 1
				end
			end
			i+=1
		end	
	end

	def add_time_to_each_player(on_field_array, time_to_add)
		on_field_array.each do |player|
			if (@stats_map.include?(player))
				@stats_map[player]["time"] += time_to_add
			end
		end
		
	end

	def calc_plus_minus_stat(arrs)
		# Gets all the events
		video_table_rows = Parse::Query.new("Videos").tap do |q|
			q.eq('team_id', @team_id)
			q.value_in('vid_id', @game_ids)
		end.get
		events_map = {}
		video_table_rows.each do |row|
			events_map[row['vid_id']] = JSON.parse(row['events_json'])
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
        @game_ids.each do |game|
        	# do I need the time array?
        	# or can I do it without it?
        	# I just need to know who is on the pitch at any given moment
        	# which I can do normally, so let's avoid the time array thing because it sucks
        	events_from_game = events_map[game]
        	next if events_from_game.nil?
        	on_field_array = ["a", "b", "c", "d", "e", "f", "g"]
			start_time = -1
        	events_from_game.each do |event|
        		sorted_on_field_array = sort_on_field_array_by_position(on_field_array)
        		case event['actualAction']
        		when 'GOAL'
        			all_combos.each do |combo|
        				add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'GOAL')
        			end
        		when 'AWAY_GOAL'
        			all_combos.each do |combo|
						add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, 1, 'AWAY_GOAL')
        			end
        		when 'SUB'
					if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time')
						end
						start_time = event["youtubeTime"]
					end
					on_field_array[event["loc"]] = event['playerIn']
        		when 'PAUSE_CLOCK'
        			if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						all_combos.each do |combo|
							add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time')
						end
						start_time = -1
					end
        		when 'START_CLOCK'
        			start_time = event["youtubeTime"]
        		when 'GAME_START'
        			start_time = event["youtubeTime"]
        		end

        	end
        end
        # change out the keys for the player names
        # and sort
        combo_stat_map_return = Hash.new
        combo_stat_map.each { |k, v|
        	new_key = []
        	k.each { |id|
        		if @players[id].nil?
        			new_key << '?'
        		else
        			new_key << @players[id][:first_name] + ' ' + @players[id][:last_name]
        		end
        	}
        	combo_stat_map_return[new_key] = v
        }
        combo_stat_map_return

	end

	def add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, value, category)
		cur_players = Array.new
		combo.each do |elt|
			cur_players << sorted_on_field_array[elt]
		end
		if (combo_stat_map[cur_players].nil?)
			combo_stat_map[cur_players] = {
				plus: 0,
				minus: 0,
				net: 0,
				time: 0
			}
		end
		case category
		when 'GOAL'
			combo_stat_map[cur_players][:plus] += value
			combo_stat_map[cur_players][:net] += value
		when 'AWAY_GOAL'
			combo_stat_map[cur_players][:minus] += value
			combo_stat_map[cur_players][:net] -= value
		when 'time'
			combo_stat_map[cur_players][:time] += value
		end
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
		Parse::Query.new("Videos").eq("team_id", @team_id).get
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
		array_of_players = Parse::Query.new("Players").eq("team_id", @team_id).get
		all_players = {}
		array_of_players.each do |player|
			all_players[player['objectId']] = {
				first_name: player['fname'],
				last_name: player['lname']
			}
		end
		all_players
	end

	def get_name_mappings
		return_mappings = {}
		@players.each do |player|
			pp player['objectId']
			return_mappings << {player['objectId'] => player['fname'] + " " + player['lname']}
		end
		pp return_mappings
	end

	def getStatsMap
		@stats_map
	end


end

