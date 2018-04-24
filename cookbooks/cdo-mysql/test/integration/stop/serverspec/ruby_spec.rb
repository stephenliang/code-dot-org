require 'serverspec'
set :backend, :exec

describe 'mysql::default' do
  describe package('mysql-server') do
    it {should be_installed}
  end

  describe service('mysql') do
    it {should be_enabled}
    it {should_not be_running}
  end
end
