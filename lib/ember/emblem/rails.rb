module Ember
  module Emblem
    module Rails
      class Engine < ::Rails::Engine
        initializer "ember_rails.setup", after: :append_assets_path, group: :all do |app|
          Ember::Emblem::Template.setup(app.assets.nil? ? app.config.assets : app.assets)
        end
      end
    end
  end
end
