require 'parse-ruby-client'

class RawStats

	attr_accessor :stats_map

	def initialize(team_id)
		calcMap(team_id)
	end

	def calcMap(team_id, games_array)
		@stats_map = {}
		@on_field_array = ["a", "b", "c", "d", "e", "f", "g"]
		start_time = -1
		games_array = get_game_events_for_team(team_id)
		games_array.each do |game|
			next if game["events_json"].nil?

			events_from_game = JSON.parse(game["events_json"])
			events_from_game.each do |event|
				player_id = nil

				if event["playerOut"].nil?
					player_id = event["playerOut"]
				elsif event["player_in"].nil?
					player_id = event["playerIn"]
				end

				unless @stats_map.include?(event[player_id])
				# could be better here
					@stats_map[event[player_id]] = {
						"shot" => 0,
						"goal" => 0,
						"assist" => 0,
						"turnover" => 0,
						"takeaway" => 0,
						"yellow_card" => 0,
						"red_card" => 0,
						"snitches" => 0,
						"plusses" => 0,
						"minuses" => 0,
						"time" => 0,
						"gain_control" => 0,
						"lose_control" => 0
					}
				end

				event_type = event["actualAction"]
				if event_type == "SUB"
					if start_time != -1
						total_time = event["youtubeTime"] - start_time
						addTimeToEachPlayer(total_time)
						start_time = event["youtubeTime"]
					end
					on_field_array[event["loc"]] = event["playerIn"]
				elsif event_type == "PAUSE_CLOCK"
					if start_time != -1
						total_time = event["youtubeTime"] - start_time
						addTimeToEachPlayer(total_time)
						start_time = event["youtubeTime"]
					end
				elsif event_type == "START_CLOCK"
					start_time = event["youtubeTime"]
				elsif event_type == "AWAY_GOAL"
					addPlusMinusVal(-1)
				elsif event_type == "GOAL"
					@stats_map[event["player_out"]][event["actualAction"].downcase] += 1
					addPlusMinusVal(1)
				else
					@stats_map[event["player_out"]][event["actualAction"].downcase] += 1
				end
								
			end
			# events_from_game.to_json
		end
		# 	events_from_game.each do |event|
		# 		player_out_id = event["player_out"]
		# 		player_in_id = event['player_in']
		# 		actual_action = event["actualAction"]
		# 	end
		# end
		# puts player_out_id
		"complete"
	end

	def addPlusMinusVal(val)

	end

	def addTimeToEachPlayer(total_time)
		
	end

	def get_game_events_for_team(team_id)
		Parse::Query.new("Videos").eq("team_id", team_id).get
	end

end

