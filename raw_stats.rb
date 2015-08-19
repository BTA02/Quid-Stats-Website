require 'parse-ruby-client'
require 'pp'

class RawStats

	attr_accessor :stats_map

	def initialize(team_id, game_ids)
		@team_id = team_id
		@game_ids = game_ids
	end

	def calcMap
		@stats_map = {}
		@on_field_array = ["a", "b", "c", "d", "e", "f", "g"]
		start_time = -1
		@game_ids = get_game_events_for_team
		@game_ids.each do |game|
			next if game["events_json"].nil?

			events_from_game = JSON.parse(game["events_json"])
			events_from_game.each do |event|
				player_id = nil
				if event["playerOut"] != ""
					player_id = event["playerOut"]
				elsif event["playerIn"] != ""
					player_id = event["playerIn"]
				end
				unless @stats_map.include?(player_id)
					if (!player_id.nil?)
						@stats_map[player_id] = {
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
					end
				end

				event_type = event["actualAction"]
				if event_type == "SUB"
					if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						addTimeToEachPlayer(time_to_add)
						start_time = event["youtubeTime"]
					end
					@on_field_array[event["loc"]] = player_id
				elsif event_type == "PAUSE_CLOCK"
					if start_time != -1
						time_to_add = event["youtubeTime"] - start_time
						addTimeToEachPlayer(time_to_add)
						start_time = event["youtubeTime"]
					end
				elsif event_type == "START_CLOCK"
					start_time = event["youtubeTime"]
				elsif event_type == "AWAY_GOAL"
					addPlusMinusVal(-1)
				elsif event_type == "SNITCH_ON_PITCH"
				elsif event_type == "AWAY_SNITCH_CATCH"
				elsif event_type == "GAME_START"
				elsif event_type == "SNITCH_CATCH"
					@stats_map[player_id]["snitch_catch"] += 1
				elsif event_type == "GOAL"
					@stats_map[player_id][event["actualAction"].downcase] += 1
					@stats_map[player_id]["shot"] += 1
					addPlusMinusVal(1)
				else
					@stats_map[player_id][event["actualAction"].downcase] += 1
				end
								
			end
		end
		# @stats_map is the return
		@stats_map
	end

	def addPlusMinusVal(val)
		@on_field_array.each do |player|
			if @stats_map.include?(player)
				if val == -1
					@stats_map[player]["minuses"] += 1
				elsif val == 1
					@stats_map[player]["plusses"] += 1
				end
			end
		end
	end

	def addTimeToEachPlayer(time_to_add)
		@on_field_array.each do |player|
			if (@stats_map.include?(player))
				@stats_map[player]["time"] += time_to_add
			end
		end
		
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

end

