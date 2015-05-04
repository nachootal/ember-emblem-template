require 'minitest_helper'

class TestEmberEmblemPrecompiler < Minitest::Test
  def test_compiles_emblem_into_handlebars
    emblem = "p = complex"
    handlebars = Ember::Emblem::Precompiler.compile(emblem)
    assert_equal "<p>{{complex}}</p>", handlebars
  end
end
