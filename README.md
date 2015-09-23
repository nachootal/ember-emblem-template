# Ember::Emblem::Template

Integrate Emblem.js with ember-rails.

## Installation

Add this line to your application's Gemfile:

```ruby
gem 'ember-emblem-template'
```

And then execute:

```
$ bundle
```

Now any templates ending in .emblem will be compiled as Ember-Handlebars templates.

## Options

You can overwrite config as the followings:

``` ruby
if defined?(Ember::Emblem::Template)
  Ember::Emblem::Template.configure do |config|
    config.precompile = true

    # If you have a rails app with two ember applications, located at:
    #   app/assets/javascripts/namespace1/app
    #   app/assets/javascripts/namespace2/app
    # then set the following. The default (empty string) is when
    # your ember app is in the rails root (app/assets/javascripts).
    # TIP: always use namespaces, for single ember rails app 
    # use namespace app (app/assets/javascripts/app)!
    config.templates_root = %w[namespace1/app/templates namespace2/app/templates]

    # You can overwrite other config
  end
end
```

### precompile

Type: `Boolean`

Enables or disables precompilation.(default: `true`)

### ember_template

Type: `String`

Default which Ember template type to compile. `HTMLBars` / `Handlebars`. (default: `HTMLBars`)

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
