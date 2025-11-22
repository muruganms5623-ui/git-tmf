import { Button, Form, Input, Select, notification, Divider, Space } from "antd";
import Loader from "components/Common/Loader";
import PAYMENT_MODES_OPTIONS from "constants/payment_modes";
import { POST, PUT } from "helpers/api_helper";
import { getDetails, getList } from "helpers/getters";
import { ADD_BRANCH, INVESTMENT, LINE, USERS } from "helpers/url_helper";
import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";

const AddInvestment = () => {
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState(null);
  const [branchList, setBranchList] = useState(null);
  const [lineList, setLineList] = useState(null);
  const [investment, setInvestment] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  useEffect(() => {
    // Get branch from localStorage
    const storedBranchName = localStorage.getItem('selected_branch_name');
    if (storedBranchName && branchList) {
      // Find the branch ID by matching the branch name
      const matchedBranch = branchList.find(
        branch => branch.branch_name === storedBranchName
      );
      if (matchedBranch) {
        setSelectedBranchId(matchedBranch.id);
      }
    }
  }, [branchList]);

  useEffect(() => {
    if (params.id)
      getDetails(INVESTMENT, params.id).then(res => setInvestment(res));
  }, [params.id, form]);

  useEffect(() => { getList(ADD_BRANCH).then(res => setBranchList(res)) }, []);

  useEffect(() => { getList(USERS).then(res => setUserList(res)) }, []);

  useEffect(() => { getList(LINE).then(res => setLineList(res)) }, []);

  useEffect(() => {
    if (
      userList != null &&
      branchList != null &&
      lineList != null &&
      (params.id == null || investment != null)
    ) {
      setLoading(false);
      
      // Set form values
      if (investment) {
        form.setFieldsValue(investment);
      }
      
      // Set branch from localStorage if not editing
      if (!params.id && selectedBranchId) {
        form.setFieldsValue({ branch: selectedBranchId });
      }
    }
  }, [userList, branchList, lineList, params.id, investment, form, selectedBranchId]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let response;
      if (params.id) {
        response = await PUT(`${INVESTMENT}${params.id}/`, values);
      } else {
        response = await POST(INVESTMENT, values);
      }
      if (response?.status === 200 || response?.status === 201) {
        notification.success({
          message: `${values.investment_title.toUpperCase()} investment ${params.id ? "updated" : "added"}!`,
          description: `Investment details has been ${params.id ? "updated" : "added"} successfully`,
        });
        navigate("/investment");
      } else {
        notification.error({
          message: `Failed to ${params.id ? "update" : "add"} investment`,
        });
      }
    } catch (error) {
      console.log(error);
      notification.error({
        message: "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      {loading && <Loader />}

      <div
        className="page-content"
        style={{
          marginRight: "10px",
          marginLeft: "-10px",
          maxWidth: "100%",
        }}
      >
        <div
          className="container-fluid"
          style={{
            marginTop: -100,
            padding: 0,
          }}
        >
          <div className="row">
            <div className="col-md-12">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                  {params.id ? "Edit Investment" : "Add Investment"}
                </h2>
                
               
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px" }}
              >
                <div className="container" style={{ padding: 0 }}>
                  
                  {/* Investment Title and User */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Investment Title"
                        name="investment_title"
                        rules={[
                          {
                            required: true,
                            message: "Please enter an investment title",
                          },
                          {
                            pattern: /^[A-Za-z][A-Za-z0-9-_ ]*$/,
                            message:
                              "Investment title must start with an alphabet and can only contain alphanumeric characters, '-' or '_'",
                          },
                        ]}
                      >
                        <Input placeholder="Enter Investment Title" size="large" />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Full Name | User Name"
                        name="user"
                        rules={[
                          { required: true, message: "Please select a user" },
                        ]}
                      >
                        <Select 
                          placeholder="Select User" 
                          allowClear
                          showSearch
                          size="large"
                        >
                          {userList?.map((user) => (
                            <Select.Option key={user.id} value={user.id}>
                              {user.full_name && `${user.full_name} | `}{user.username}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Branch and Line */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch Name"
                        name="branch"
                        rules={[
                          { required: true, message: "Please select a branch" },
                        ]}
                      >
                        <Select 
                          placeholder="Select Branch" 
                          disabled
                          showSearch
                          size="large"
                        >
                          {branchList?.map((branch) => (
                            <Select.Option key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Name"
                        name="line"
                        rules={[
                          { required: true, message: "Please select a line" },
                        ]}
                      >
                        <Select 
                          placeholder="Select Line" 
                          allowClear
                          showSearch
                          size="large"
                        >
                          {lineList?.map((line) => {
                            const branchId = form.getFieldValue("branch") || selectedBranchId;
                            if (branchId === line?.branch) {
                              return (
                                <Select.Option key={line.id} value={line.id}>
                                  {line.lineName}
                                </Select.Option>
                              );
                            }
                            return null;
                          })}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Investment Amount and Payment Mode */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Investment Amount"
                        name="investment_amount"
                        rules={[
                          { required: true, message: "Please enter an amount" },
                          {
                            type: "number",
                            min: 1,
                            message: "Amount must be greater than 0",
                            transform: (value) => Number(value),
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter Investment Amount"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Payment Mode"
                        name="payment_mode"
                        rules={[
                          {
                            required: true,
                            message: "Please select a payment mode",
                          },
                        ]}
                      >
                        <Select 
                          placeholder="Select Payment Mode" 
                          allowClear
                          size="large"
                        >
                          {PAYMENT_MODES_OPTIONS.map((mode) => (
                            <Select.Option key={mode.value} value={mode.value}>
                              {mode.label}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Date and Comment */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Date of Investment"
                        name="investment_date"
                        rules={[
                          { required: true, message: "Please select a date" },
                        ]}
                      >
                        <Input type="date" size="large" />
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item label="Comment" name="comments">
                        <Input.TextArea 
                          placeholder="Enter Comment" 
                          size="large"
                          rows={1}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Investment" : "Add Investment"}
                      </Button>
                       <Button
                  size="large"
                  onClick={() => navigate("/investment")}
                >
                  Cancel
                </Button>
                    </Space>
                    
                  </div>
                </div>
              </Form>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    </Fragment>
  );
};

export default AddInvestment;
