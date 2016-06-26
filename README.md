# Quidstats Website

Web view for quidditch states. Made by Andrew Axtell with help from David once in a while. 

## Around the web

See the [webapp](https://quidstats.herokuapp.com/) for online stat recording from youtube videos.

Check out the [android app](https://play.google.com/store/apps/details?id=local.quidstats) in the Play store.

## Running it locally

To start, run `./bootstrap.sh` (may require sudo). If you need to install ruby 2.0.0, we recommend `[rvm](https://rvm.io)`. 

You'll need a `.env` file that defines `PARSE_APP_ID` and `PARSE_API_KEY` to actually read/write your own data. 

Then, run `bundle exec rackukp` and go to the listed port (probably 4567): `localhost:4567` to see the app.

Run on c9: ruby main.rb -p $PORT -o $IP
