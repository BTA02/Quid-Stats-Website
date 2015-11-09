require 'parse-ruby-client'
require 'pp'
require 'set'

class CalcStats

	attr_accessor :stats_map

	def initialize(team_id, game_ids, author_id, per)
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
		all_stats = Parse::Query.new("Stats").tap do |q|
			q.eq('team_id', @team_id)
			q.eq('author_id', @author_id)
			q.value_in('vid_id', @game_ids)
			q.order_by = "vid_id,time"
			q.limit = 1000
		end.get
		# come back to this when I have too many games
		all_stats
	end

	def raw_stats
		events_from_games = get_stats_rows_from_games()
		if events_from_games.nil?
			return nil
		end
		@stats_map = {}
		start_time = -1
		cur_game = "notAGame"
		on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
		events_from_games.each do |event|
			if cur_game != event["vid_id"]
				on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
			end
			cur_game = event["vid_id"]
			player_id = nil
			if event["stat_name"] == "SUB"
				player_id = event["player_in_id"]
			else
				player_id = event["player_id"]
			end

			unless @stats_map.include?(player_id)
				if (!player_id.nil?)
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
						"turnover" => 0,
						"takeaway" => 0,
						"yellow_card" => 0,
						"red_card" => 0,
						"snitch_catch" => 0,
						"plusses" => 0,
						"minuses" => 0,
						"net" => 0,
						"ratio" =>'',
						"time" => 0
						# "gain_control" => 0,
						# "lose_control" => 0
					}
				end
			end

			event_type = event["stat_name"]

			if event_type == "SUB"
				if start_time != -1
					time_to_add = event["time"] - start_time
					add_time_to_each_player(on_field_array, time_to_add)
					start_time = event["time"]
				end
				ind = on_field_array.index(event["player_id"])
				on_field_array[ind] = player_id
			elsif event_type == "PAUSE_CLOCK"
				if start_time != -1
					time_to_add = event["time"] - start_time
					add_time_to_each_player(on_field_array, time_to_add)
					start_time = -1
				end
			elsif event_type == "START_CLOCK"
				start_time = event["time"]
			elsif event_type == "GAME_START"
				start_time = event["time"]
			elsif event_type == "AWAY_GOAL"
				add_plus_minus_val(on_field_array, -1)
			elsif event_type == "SNITCH_ON_PITCH"
			elsif event_type == "AWAY_SNITCH_CATCH"
			
			elsif event_type == "SNITCH_CATCH"
				@stats_map[player_id]["snitch_catch"] += 1
			elsif event_type == "GOAL"
				@stats_map[player_id][event["stat_name"].downcase] += 1
				@stats_map[player_id]["shot"] += 1
				add_plus_minus_val(on_field_array, 1)
			else
				@stats_map[player_id][event["stat_name"].downcase] += 1
			end				
		end
        pp @stats_map.values
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
					elsif val['time'] != 0
						val1 = val1.to_f / (val['time'].to_f / 60.0)
						val1.round(2)
					end
				}
			}
		end
		@stats_map.values

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

	def add_time_to_each_player(on_field_array, time_to_add)
		on_field_array.each do |player|
			if (@stats_map.include?(player))
				@stats_map[player]["time"] += time_to_add
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

    	all_stats.each do |event|
    		if event["vid_id"] != cur_game
    			on_field_array = ["chaserA", "chaserB", "chaserC", "keeper", "beaterA", "beaterB", "seeker"]
    		end
    		cur_game = event['vid_id']
    		sorted_on_field_array = sort_on_field_array_by_position(on_field_array)
    		case event['stat_name']
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
					time_to_add = event["time"] - start_time
					all_combos.each do |combo|
						add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time')
					end
					start_time = event["time"]
				end
				ind = on_field_array.index(event['player_id'])
				on_field_array[ind] = event["player_in_id"]
    		when 'PAUSE_CLOCK'
    			if start_time != -1
					time_to_add = event["time"] - start_time
					all_combos.each do |combo|
						add_stat_to_combo(combo_stat_map, sorted_on_field_array, combo, time_to_add, 'time')
					end
					start_time = -1
				end
    		when 'START_CLOCK'
    			start_time = event["time"]
    		when 'GAME_START'
    			start_time = event["time"]
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
        	if @per == 1 
	        	v.update(v) { |key1, val1|
	        		if key1 != :time && v[:time] != 0
	        			val1 = val1.to_f / (v[:time].to_f / 60.0)
						val1.round(2)
					else
						val1 = v[key1]
					end

	        	}
	        end
        	# this is cheating
        	# why?
        	# im betting because i'm removing pairs with <5 seconds together
        	prettyTime = Time.at(v[:time]).utc.strftime("%M:%S")
        	if v[:time] > 5
        		# v[:time] = prettyTime
        		combo_stat_map_return[new_key] = v
        	end
        		
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
		resp = Parse::Query.new("Rosters").tap do |q|
			q.eq("team_id", @team_id)
		end.get
		playersSet = Set.new
		for i in 0..resp.length-1
			players = Parse::Query.new("Players").tap do |q|
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
end

