require 'minitest_helper'
require 'pry'

class TestEmberEmblemTemplate < Minitest::Test
  def setup
    @env = Sprockets::Environment.new
    @env.append_path File.expand_path('../fixtures', __FILE__)

    Ember::Emblem::Template.setup @env
  end

  def test_that_it_has_a_version_number
    refute_nil ::Ember::Emblem::VERSION
  end

  def test_should_replace_separators_with_templates_path_separator
    with_template_root('', '-') do
      asset = @env['app/templates/application.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["app-templates-application"\]}, asset.to_s
    end
  end

  def test_should_strip_only_first_occurence_of_templates_root
    with_template_root('app', '/') do
      asset = @env['app/templates/app/example.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["templates/app/example"\]}, asset.to_s
    end
  end

  def test_should_strip_templates_root_with_slash_in_it
    with_template_root('app/templates') do
      asset = @env['app/templates/app/example.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["app/example"\]}, asset.to_s
    end
  end

  def test_should_strip_different_template_roots
    with_template_root(['templates', 'templates_mobile']) do
      asset = @env['templates/hi.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["hi"\]}, asset.to_s
    end

    with_template_root(['templates', 'templates_mobile']) do
      asset = @env['templates_mobile/hi.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["hi"\]}, asset.to_s
    end
  end

  def test_should_allow_partial_templates_root_matching
    with_template_root('templates') do
      asset = @env['app/templates/hi.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["app/hi"\]}, asset.to_s
    end
  end

  def test_should_compile_template_named_as_index
    with_template_root('templates') do
      asset = @env['templates/index.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["index"\]}, asset.to_s
    end
  end

  def test_should_compile_template_named_as_index_without_dir
    with_template_root('') do
      asset = @env['index.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["index"\]}, asset.to_s
    end
  end

  def test_compile_template_with_Handlebars_namespace
    with_ember_template 'Handlebars' do
      asset = @env['templates/hi.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["hi"\] = Ember\.Handlebars\.template\(}, asset.to_s
    end
  end

  def test_compile_template_with_HTMLBars_namespace
    with_ember_template 'HTMLBars' do
      asset = @env['templates/hi.emblem']

      assert_equal 'application/javascript', asset.content_type
      assert_match %r{Ember.TEMPLATES\["hi"\] = Ember\.HTMLBars\.template\(}, asset.to_s
    end
  end

  def test_should_compile_template_all_the_way_down
    asset = @env['complex.emblem']
    assert_match %r{dom.createElement\(\"p}, asset.to_s
    assert_match %r{dom.createTextNode\(\"complex}, asset.to_s
  end

  #def test_logical_path_is_js_not_emblem
  #  assert_equal 'app/templates/application.js', @env['app/templates/application.emblem'].logical_path
  #end

  private

  def config
    Ember::Emblem::Template.config
  end

  def with_template_root(root, sep=nil)
    old, config.templates_root = config.templates_root, root

    if sep
      old_sep, config.templates_path_separator = config.templates_path_separator, sep
    end

    yield
  ensure
    config.templates_root = old
    config.templates_path_separator = old_sep if sep
  end

  def with_amd_output(namespace)
    old, config.output_type = config.output_type, :amd
    old_namespace, config.amd_namespace = config.amd_namespace, namespace

    yield
  ensure
    config.output_type = old
    config.amd_namespace = old_namespace
  end

  def with_ember_template(template)
    old, config.ember_template = config.ember_template, template

    yield
  ensure
    config.ember_template = old
  end
end
