require 'sprockets'
require 'barber'
require 'ember/handlebars/template'

module Ember
  module Emblem
    autoload :VERSION, 'ember/emblem/version'
    autoload :Config, 'ember/emblem/config'
    autoload :Precompiler, 'ember/emblem/precompiler'

    class Template < Ember::Handlebars::Template
      def self.setup(env)
        env.register_engine '.emblem', self
      end

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

      private

      def global_template_target(module_name, config)
        "Ember.TEMPLATES[#{template_path(module_name, config).inspect}]"
      end

      def template_path(path, config)
        root = config.templates_root

        if root.kind_of? Array
          root.each do |r|
            path.sub!(/#{Regexp.quote(r)}\//, '')
          end
        else
          unless root.empty?
            path.sub!(/#{Regexp.quote(root)}\/?/, '')
          end
        end

        path = path.split('/')

        path.join(config.templates_path_separator)
      end

      def compile_ember_emblem(string, ember_template = 'handlebars')
        handlebars = Precompiler.compile(string)
        "Ember.#{ember_template}.compile(#{indent(handlebars).inspect});"
      end

      def precompile_ember_emblem(string, ember_template = 'handlebars')
        handlebars = Precompiler.compile(string)
        "Ember.#{ember_template}.template(#{Barber::Ember::Precompiler.compile(handlebars)});"
      end
    end
  end
end
