require 'sprockets'
require 'barber'

module Ember
  module Emblem
    autoload :VERSION, 'ember/emblem/version'
    autoload :Config, 'ember/emblem/config'
    autoload :Helper, 'ember/emblem/helper'

    case Sprockets::VERSION
    when /\A2\./
      autoload :Template, 'ember/emblem/templates/sprockets2'
    when /\A3\./
      autoload :Template, 'ember/emblem/templates/sprockets3'
    else
      raise "Unsupported sprockets version: #{Sprockets::VERSION}"
    end
  end
end
