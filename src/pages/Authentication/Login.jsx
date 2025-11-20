import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography, Modal, Select, Spin } from "antd";
import PropTypes from "prop-types";
import { useState } from "react";
import { ToastContainer } from "react-toastify";

import CustomToast from "components/Common/Toast";

//redux
import withRouter from "components/Common/withRouter";
import { Link, useNavigate } from "react-router-dom";


// Note: Replaced Formik with Ant Design form validation

// import css
import "../../assets/scss/_login.scss";
// import images
import logo from "assets/images/login-logo.png";
 
import { GET, POST } from "../../helpers/api_helper";
import { setUser } from "../../helpers/jwt-token-access/accessToken";
import { LOGIN_URL, USERS } from "../../helpers/url_helper";
import { ADD_BRANCH } from "../../helpers/url_helper"; // Add this import

const { Title } = Typography;

function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  //meta title
  document.title = "Login | Finance";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFormValues, setHasFormValues] = useState(false);
  
  // Branch selection modal states
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchLoading, setBranchLoading] = useState(false);

  const dummyUserData = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    mobile_number: "9876543210",
    role: "Admin",
    allow_transaction: true,
    selected_columns: {},
    address: "123 Test Street, Test City",
    pin_code: 123456,
    full_name: "Test User",
    created_by: "admin",
    last_updated_by: "admin",
    created_ts: "2024-01-01T00:00:00Z",
    last_updated_ts: "2024-01-01T00:00:00Z",
    employees: [
      {
        id: 1,
        user: 1,
        branch: 1,
        line: 1,
        area: 1,
        branch_name: "Main Branch",
        line_name: "Test Line",
        area_name: "Test Area",
        created_by: "admin",
        last_updated_by: "admin"
      }
    ],
    user_expenses: [],
    investment_expense_mappings: [],
    line_wise_investment_expenses: []
  };
  
  const onFinish = async (values) => {
    setLoading(true);

    var res = await POST(LOGIN_URL, values);
    if(res.status === 200){
      localStorage.setItem("access_token", res.data.access);
      setLoading(false);
      setError('');
      get_user(res.data.access)
     
    }
    else if(res.status === 401){
    CustomToast(res.data.detail, "error");
    setLoading(false);

    }
    else{
    setLoading(false);
    CustomToast("Internal Server Error", "error");
    
  }
  };

  const handleFormChange = (changedValues, allValues) => {
    const hasValues = Object.values(allValues).some(value => 
      value !== undefined && value !== null && value !== ""
    );
    setHasFormValues(hasValues);
  };

  const handleReset = () => {
    form.resetFields();
    setHasFormValues(false);
    setError('');
  };

  // Fetch branches list
  const getBranchesList = async () => {
    setBranchLoading(true);
    try {
      const response = await GET(ADD_BRANCH);
      if (response?.status === 200) {
        setBranches(response.data);
        // If only one branch exists, auto-select it
        if (response.data.length === 1) {
          setSelectedBranch(response.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      CustomToast("Failed to load branches", "error");
    } finally {
      setBranchLoading(false);
    }
  };

  const get_user = async(token)=>{
    if(token){
      try {
        // Fetch user details from /users/me endpoint
        const userResponse = await GET(`${USERS}me/`);
        
        if(userResponse.status === 200){
          // Store user details using setUser method
          setUser(userResponse.data);
        } else {
          setUser(dummyUserData);
        }
        setLoading(false);
        
        // Show branch selection modal instead of navigating directly
        setBranchModalVisible(true);
        await getBranchesList();
        
      } catch (error) {
        setUser(dummyUserData);
        setLoading(false);
        
        // Show branch selection modal even on error
        setBranchModalVisible(true);
        await getBranchesList();
      }
    }else{
      setLoading(false);
      CustomToast("Internal Server Error", "error");
    }
  };

  // Handle branch selection and navigation
  const handleBranchSelection = () => {
    if (!selectedBranch) {
      CustomToast("Please select a branch", "warning");
      return;
    }

    // Find the selected branch details
    const selectedBranchData = branches.find(b => b.id === selectedBranch);
    
    // Store branch information in localStorage
    localStorage.setItem("selected_branch_id", selectedBranch);
    localStorage.setItem("selected_branch_name", selectedBranchData?.branch_name || "");
    localStorage.setItem("selected_branch_data", JSON.stringify(selectedBranchData));

    // Close modal and navigate
    setBranchModalVisible(false);
    navigate('/view');
    
    CustomToast(`Branch "${selectedBranchData?.branch_name}" selected successfully`, "success");
  };

  
  return (
    <>
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f5f5f5'
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Card 
            className="overflow-hidden"
            style={{ 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '8px'
            }}
          >
                <div className="bg-primary bg-soft" style={{ backgroundColor: '#556ee640', padding: '20px', textAlign: 'center' }}>
                  <Title level={4} style={{ color: '#556ee6', margin: 0 }}>Welcome Back To TMF!</Title>
                  <p style={{ margin: '8px 0 0 0' }}>Sign In</p>
                </div>
                
                <div style={{ padding: '24px' }}>
                  <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Link to="/">
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        backgroundColor: '#f8f9fa', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginBottom: '16px'
                      }}>
                        <img
                          src={logo}
                          alt=""
                          style={{ borderRadius: '50%', height: '57px' }}
                        />
                      </div>
                    </Link>
                  </div>
                  
                  {error && (
                    <Alert
                      message={error}
                      type="error"
                      style={{ marginBottom: '16px' }}
                      showIcon
                    />
                  )}

                  <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    onValuesChange={handleFormChange}
                    layout="vertical"
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      label="Email/Login ID"
                      rules={[
                        {
                          required: true,
                          message: 'Please Enter your Email / Login Id',
                        },
                      ]}
                    >
                      <Input 
                        placeholder="Enter LoginId"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        {
                          required: true,
                          message: 'Please Enter Your Password',
                        },
                      ]}
                    >
                      <Input.Password 
                        placeholder="Enter Password"
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          size="large"
                          style={{ 
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          {loading ? 'Loading...' : 'Log In'}
                        </Button>
                        {hasFormValues && (
                          <Button
                            type="default"
                            danger
                            icon={<ReloadOutlined />}
                            onClick={handleReset}
                            size="large"
                            style={{ 
                              height: '48px',
                              width: '48px'
                            }}
                            title="Reset Form"
                          />
                        )}
                      </div>
                    </Form.Item>
                  </Form>
                </div>
              </Card>
              
          
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ color: '#6c757d' }}>
              © {new Date().getFullYear()} - THINKTANK
            </p>
          </div>
        </div>
      </div>

      {/* Branch Selection Modal */}
     {/* Branch Selection Modal */}
<Modal
  title={null}
  open={branchModalVisible}
  onOk={handleBranchSelection}
  footer={null}
  closable={false}
  maskClosable={false}
  width={450}
>
  <div style={{ textAlign: 'center', padding: '24px 0 20px 0' }}>
    {/* Branch Header - Centered */}
    <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
      Branch
    </Title>
    
    {/* Currently Logged-In as */}
    <div style={{ marginTop: '16px', fontSize: '15px', color: '#595959' }}>
      Currently Logged-In as:{' '}
      <span style={{ 
        fontWeight: 600, 
        color: '#1677ff',
        fontSize: '16px'
      }}>
        {form.getFieldValue('username') || 'User'}
      </span>
    </div>
  </div>

  <div style={{ padding: '0 24px 24px 24px' }}>
    {/* Select Branch Title */}
    <p style={{ 
      marginBottom: 12, 
      color: '#262626', 
      fontSize: '15px',
      fontWeight: 500 
    }}>
      Select the branch to proceed
    </p>
    
    {branchLoading ? (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#8c8c8c' }}>Loading branches...</p>
      </div>
    ) : (
      <>
        {/* Branch Dropdown */}
        <Select
          style={{ width: "100%", marginBottom: '24px' }}
          placeholder="Select Branch"
          size="large"
          value={selectedBranch}
          onChange={setSelectedBranch}
          showSearch
          optionFilterProp="label"
          options={branches.map(branch => ({
            label: branch.branch_name,
            value: branch.id
          }))}
          notFoundContent={
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>No branches available</p>
            </div>
          }
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            size="large"
            style={{ 
              flex: 1,
              height: '44px',
              fontSize: '15px'
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleBranchSelection}
            disabled={!selectedBranch}
            style={{ 
              flex: 1,
              height: '44px',
              fontSize: '15px',
              fontWeight: 500
            }}
          >
            Continue
          </Button>
        </div>
      </>
    )}
  </div>
</Modal>
      
      <ToastContainer/>
    </>
  );
};

export default withRouter(Login);

Login.propTypes = {
  history: PropTypes.object,
};
