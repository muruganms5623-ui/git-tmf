import { useEffect, useState, useCallback } from "react";
import { Form, Input, Button, Select, notification } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { LINE, ADD_BRANCH } from "helpers/url_helper";
import { POST, GET } from "helpers/api_helper";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

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

  useEffect(() => {
    if (params.id) {
      getLineDetails();
    }
  });

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

  const resetForm = () => {
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
  };

  const options = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  const isFormEmpty = () => {
    return (
      !formData.lineName &&
      !formData.lineType &&
      !formData.branch &&
      !formData.installment &&
      !formData.badinstallment
    );
  };

  return (
    <>
      {loader && <Loader />}

      <div className="page-content">
        <div className="cursor-pointer back-icon">
          <span onClick={() => navigate("/line")}>
            <ArrowLeftOutlined /> Back
          </span>
        </div>

        <div
          className="container-fluid"
          style={{ paddingTop: params?.id ? "25px" : "" }}
        >
          <div className="row">
            <div className="col-md-12">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>Line Details</h5>
              </div>
              <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                onValuesChange={onValuesChange}
                initialValues={formData}
              >
                <div className="card p-4 shadow-sm">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <Form.Item
                        label="Branch"
                        name="branch"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Select
                          placeholder="Select Branch"
                          allowClear={!params.id}
                          showSearch
                          size="large"
                          loading={branchLoader}
                        >
                          {branchList?.map((branch) => (
                            <Option key={branch?.id} value={branch?.id}>
                              {branch?.branch_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Name"
                        name="lineName"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Input placeholder="Enter the line Name" size="large" />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <Form.Item
                        label="Line Type"
                        name="lineType"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
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
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter the no of installment"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <Form.Item
                        label="No of Bad Installment"
                        name="badinstallment"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Input
                          type="number"
                          placeholder="Enter the no of bad installment"
                          size="large"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="d-flex justify-content-center mt-4">
                    <Button type="primary" htmlType="submit" className="me-3">
                      {params.id ? "Update" : "Submit"}
                    </Button>
                    {!isFormEmpty() && (
                      <Button
                        type="default"
                        icon={<ReloadOutlined />}
                        onClick={resetForm}
                        variant="solid"
                        color="danger"
                      >
                        Reset
                      </Button>
                    )}
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
