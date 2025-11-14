import { useEffect, useState, useCallback } from "react";
import { Form, Input, Button, Select, notification,Divider,Space } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { LINE, ADD_BRANCH } from "helpers/url_helper";
import { POST, GET } from "helpers/api_helper";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
// import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

const { Option } = Select;

const AddLine = () => {
  const [loader, setLoader] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [formData, setFormData] = useState({
    lineName: "",
    lineType: "",
    branch: "",
    installment: null,
    badinstallment: null,
  });
  const [branchLoader, setBranchLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getBranchList();
  }, []);

 const getLineDetails = useCallback(async () => {
  try {
    setLoader(true);
    const response = await GET(`${LINE}${params.id}`);
    if (response?.status === 200) {
      setFormData(response?.data || []);
      form.setFieldsValue(response?.data);
    } else {
      setFormData([]);
    }
    setLoader(false);
  } catch (error) {
    setFormData([]);
    setLoader(false);
    console.log(error);
  }
}, [params.id, form]);

useEffect(() => {
  if (params.id) {
    getLineDetails();
  }
}, [params.id, getLineDetails]);


  const getBranchList = async () => {
    try {
      setBranchLoader(true);
      const response = await GET(ADD_BRANCH);
      if (response?.status === 200) {
        setBranchList(response?.data);
      } else {
        setBranchList([]);
      }
      setBranchLoader(false);
    } catch (error) {
      setBranchList([]);
      setBranchLoader(false);
    }
  };

  const onFinish = async () => {
    setLoader(true);
    try {
      const response = await POST(LINE, formData);
      setLoader(false);
      if (response.status === 400) {
        notification.error({
          message: "Line",
          description:
            response?.data?.lineName?.[0] ||
            `Line is not ${params.id ? "update" : "create"}.Please try again`,
          duration: 0,
        });
        return;
      }

      setFormData({
        lineName: "",
        lineType: "",
        branch: "",
        installment: null,
        badinstallment: null,
      });
      form.setFieldsValue({
        lineName: "",
        lineType: "",
        branch: "",
        installment: null,
        badinstallment: null,
      });
      notification.success({
        message: `${response?.data?.lineName?.toUpperCase()} Line ${
          params.id ? "Update" : "Create"
        }!`,
        description: `The line has been ${
          params.id ? "updated" : "created"
        } successfully.`,
        duration: 0,
      });

      navigate(`/line`);
    } catch (error) {
      notification.error({
        message: "Line",
        description: "The line is not created.",
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    setFormData({ ...formData, ...allValues });
  };

  // const resetForm = () => {
  //   setFormData({
  //     lineName: "",
  //     lineType: "",
  //     branch: "",
  //     installment: null,
  //     badinstallment: null,
  //   });
  //   form.setFieldsValue({
  //     lineName: "",
  //     lineType: "",
  //     branch: "",
  //     installment: null,
  //     badinstallment: null,
  //   });
  // };

  const options = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  // const isFormEmpty = () => {
  //   return (
  //     !formData.lineName &&
  //     !formData.lineType &&
  //     !formData.branch &&
  //     !formData.installment &&
  //     !formData.badinstallment
  //   );
  // };

  return (
      <>
      {loader && <Loader />}

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
                  alignItems: "center",
                  marginBottom: "20px",
                  gap: "10px",
                }}
              >
                {/* <ArrowLeftOutlined
                  onClick={() => navigate("/line")}
                  style={{ cursor: "pointer", fontSize: "18px" }}
                /> */}
                <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                  {params.id ? "Edit Line" : "Add Line"}
                </h2>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={onValuesChange}
                initialValues={formData}
                style={{ padding: 0, marginRight: "-20px", marginBottom: "-30px" }}
              >
                <div className="container" style={{ padding: 0 }}>
                 

                  {/* Branch and Line Name */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        name="branch"
                        rules={[{ required: true, message: "Branch is required" }]}
                      >
                        <Select
                          placeholder="Select Branch"
                          allowClear={!params.id}
                          showSearch
                          size="large"
                          loading={branchLoader}
                        >
                          {branchList.map((branch) => (
                            <Option key={branch.id} value={branch.id}>
                              {branch.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Line Name"
                        name="lineName"
                        rules={[{ required: true, message: "Line Name is required" }]}
                      >
                        <Input placeholder="Enter line name" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Line Type & Installment */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Type"
                        name="lineType"
                        rules={[{ required: true, message: "Line Type is required" }]}
                      >
                        <Select placeholder="Select Line Type" size="large">
                          {options.map((option) => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="col-md-6">
                      <Form.Item
                        label="Installment"
                        name="installment"
                        rules={[
                          { required: true, message: "Installment is required" },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter number of installments"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Bad Installment */}
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <Form.Item
                        label="No. of Bad Installments"
                        name="badinstallment"
                        rules={[
                          {
                            required: true,
                            message: "No of bad installments is required",
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter bad installment count"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <Divider style={{ borderTop: "2px solid #d9d9d9" }} />

                  {/* Buttons */}
                  <div className="text-center mt-4">
                    <Space size="large">
                      <Button type="primary" htmlType="submit" size="large">
                        {params.id ? "Update Line" : "Add Line"}
                      </Button>

                      {/* {!isFormEmpty() && (
                        <Button
                          size="large"
                          onClick={resetForm}
                          icon={<ReloadOutlined />}
                        >
                          Reset
                        </Button>
                      )} */}

                      <Button
                        size="large"
                        onClick={() => navigate("/line")}
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
    </>
  );
};

export default AddLine;
