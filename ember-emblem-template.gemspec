lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'ember/emblem/version'

Gem::Specification.new do |spec|
  spec.name          = 'ember-emblem-template'
  spec.version       = Ember::Emblem::VERSION
  spec.authors       = ['Ryunosuke SATO']
  spec.email         = ['tricknotes.rs@gmail.com']

  spec.summary       = %q{The sprockets template for Ember Emblem.}
  spec.description   = %q{The sprockets template for Ember Emblem.}
  spec.homepage      = 'https://github.com/botandrose/ember-emblem-template'
  spec.license       = 'MIT'

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.bindir        = 'exe'
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ['lib']

  spec.add_dependency 'ember-handlebars-template', '~> 0.6.0'

  spec.add_development_dependency 'bundler', '~> 1.7'
  spec.add_development_dependency 'rake', '~> 10.0'
  spec.add_development_dependency 'minitest'
end
