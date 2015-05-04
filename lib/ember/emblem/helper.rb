require "barber/ember/precompiler"

module Ember
  module Emblem
    module Helper
      def self.included(base)
        base.extend ClassMethods
      end

      module ClassMethods
        def setup_ember_template_compiler(path)
          Barber::Ember::Precompiler.ember_template_compiler_path = path
        end
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

      def indent(string)
        string.gsub(/$(.)/m, "\\1  ").strip
      end
    end
  end
end

