require "execjs"

module Ember
  module Emblem
    class Precompiler
      def self.compile template
        new.compile(template)
      end

      def compile template
        context.call precompile_function, sanitize(template)
      rescue ExecJS::ProgramError => ex
        raise Barber::PrecompilerError.new(template, ex)
      end

      private

      def context
        @context ||= ExecJS.compile(source)
      end

      def precompile_function
        "Emblem.compile"
      end

      def source
        [
          File.read(loader_path),
          File.read(emblem_source_path),
          File.read(precompiler_path),
        ].join("\n;\n")
      end

      def emblem_source_path
        File.expand_path("../../../emblem/emblem.amd.js", __FILE__)
      end

      def loader_path
        File.expand_path("../../../emblem/loader.js", __FILE__)
      end

      def precompiler_path
        File.expand_path("../../../emblem/precompiler.js", __FILE__)
      end

      def sanitize(template)
        begin
          if template =~ /\A".+"\Z/m
            # Case 1
            sanitize_with_json(template)
          else
            # Case 2
            sanitize_with_regexp(template)
          end
        rescue JSON::ParserError
          # Case 3
          template
        end
      end

      def sanitize_with_json(template)
        JSON.load(%Q|{"template":#{template}}|)['template']
      end

      def sanitize_with_regexp(template)
        if template.respond_to? :gsub
          sanitized = template.gsub(/\\n/,"\n")
          sanitized = sanitized.gsub(/\\["']/, '"')
          sanitized
        else
          template
        end
      end
    end
  end
end

