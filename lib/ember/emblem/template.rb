require 'sprockets'
require 'barber'

module Ember
  module Emblem
    autoload :VERSION, 'ember/emblem/version'
    autoload :Config, 'ember/emblem/config'
    autoload :Helper, 'ember/emblem/helper'
    autoload :Precompiler, 'ember/emblem/precompiler'

    class Template < Tilt::Template
      include Helper

      self.default_mime_type = 'application/javascript'

      class << self
        def configure
          yield config
        end

        def setup(env)
          env.register_engine '.emblem', self
        end

        def config
          @config ||= Config.new
        end
      end

      def prepare; end

      def evaluate(scope, locals, &block)
        template = data

        if config.precompile
          template = precompile_ember_emblem(template, config.ember_template)
        else
          template = compile_ember_emblem(template, config.ember_template)
        end

        target = global_template_target(scope.logical_path, config)
        "#{target} = #{template}\n"
      end

      def config
        @config ||= self.class.config.dup
      end
    end
  end
end
