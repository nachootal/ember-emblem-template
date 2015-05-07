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

## Options

You can overwrite config as the followings:

``` ruby
Ember::Emblem::Template.configure do |config|
  config.precompile = true

  # You can overwrite other config
end
```

### precompile

Type: `Boolean`

Enables or disables precompilation.(default: `true`)

### ember_template

Type: `String`

Default which Ember template type to compile. `HTMLBars` / `Handlebars`. (default: `HTMLBars`)

### templates_root

Type: `String`

Sets the root path for templates to be looked up in. (default: `templates`)

### templates_path_separator

Type: `String`

The path separator to use for templates. (default: `/`)

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request
