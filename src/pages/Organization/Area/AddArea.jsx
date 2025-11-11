import { useEffect, useState } from "react";
import { Form, Input, Button, Select, notification } from "antd";
import { ToastContainer } from "react-toastify";
import Loader from "components/Common/Loader";
import { LINE, ADD_BRANCH, AREA } from "helpers/url_helper";
import { POST, GET } from "helpers/api_helper";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";

const { Option } = Select;

const AddArea = () => {
  const [loader, setLoader] = useState(false);
  const [branchList, setBranchList] = useState([]);
  const [lineList, setLineList] = useState([]);
  const [formData, setFormData] = useState({
    line_id: "",
    areaName: "",
    branch_id: "",
  });
  const [branchLoader, setBranchLoader] = useState(false);
  const [lineLoader, setLineLoader] = useState(false);
  const [form] = Form.useForm();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    getBranchList();
    getLineList();
  }, []);

  useEffect(() => {
    if (params.id) {
      getAreaDetails();
    }
  }, [params.id,getAreaDetails]);

  const getAreaDetails = async () => {
    try {
      setLoader(true);
      const response = await GET(`${AREA}${params.id}`);
      if (response?.status === 200) {
        setFormData(response?.data || []);
        form.setFieldsValue(response?.data);
        const updatedData = {
          ...response?.data,
          line_id: response?.data?.lineid,
          branch_id: response?.data?.branchid,
        };
        delete updatedData?.lineid;
        delete updatedData?.branchid;
        setFormData(updatedData || []);
        form.setFieldsValue(updatedData);
      } else {
        setFormData([]);
      }
      setLoader(false);
    } catch (error) {
      setFormData([]);
      setLoader(false);
      console.log(error);
    }
  };

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

  const getLineList = async () => {
    try {
      setLineLoader(true);
      const response = await GET(LINE);
      if (response?.status === 200) {
        setLineList(response?.data);
      } else {
        setLineList([]);
      }
      setLineLoader(false);
    } catch (error) {
      setLineList([]);
      setLineLoader(false);
    }
  };

  const onFinish = async () => {
    setLoader(true);
    try {
      const response = await POST(AREA, formData);
      setLoader(false);
      if (response.status >= 400) {
        notification.error({
          message: `${params.id ? "Update" : "Create"}`,
          description: `The area is not ${
            params?.id ? "updated" : "created"
          }. Please Try again`,
          duration: 0,
        });
        return;
      }
      setFormData({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      form.setFieldsValue({
        line_id: "",
        areaName: "",
        branch_id: "",
      });
      notification.success({
        message: `${formData?.areaName} Area ${
          params.id ? "Updated" : "Created"
        }!`,
        description: `The area has been ${
          params?.id ? "updated" : "created"
        } successfully.`,
        duration: 0,
      });

      navigate(`/area`);
    } catch (error) {
      notification.error({
        message: "Area",
        description: "The area is not created.",
        duration: 0,
      });
    } finally {
      setLoader(false);
    }
  };

  const onValuesChange = (changedValues, allValues) => {
    if (changedValues?.branch_id) {
      setFormData({ ...formData, ...allValues, line_id: "" });
      form.setFieldsValue({
        line_id: "",
      });
      return;
    }
    setFormData({ ...formData, ...allValues });
  };

  const resetForm = () => {
    setFormData({
      line_id: "",
      areaName: "",
      branch_id: "",
    });
    form.setFieldsValue({
      line_id: "",
      areaName: "",
      branch_id: "",
    });
  };

  const isFormEmpty = () => {
    return !formData.line_id && !formData.branch_id && !formData.areaName;
  };
  console.log("formData", formData);

  return (
    <>
      {loader && <Loader />}

      <div className="page-content">
        <div className="cursor-pointer back-icon">
          <span onClick={() => navigate("/area")}>
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
                <h5>Area Details</h5>
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
                        name="branch_id"
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
                        label="Line"
                        name="line_id"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Select
                          placeholder="Select Line"
                          allowClear={!params.id}
                          showSearch
                          size="large"
                          loading={lineLoader}
                        >
                          {lineList?.map((line) => {
                            if (formData?.branch_id === line?.branch) {
                              return (
                                <Option key={line?.lineName} value={line?.id}>
                                  {line?.lineName}
                                </Option>
                              );
                            }
                          })}
                        </Select>
                      </Form.Item>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <Form.Item
                        label="Area Name"
                        name="areaName"
                        rules={[
                          {
                            required: true,
                            message: "This field is required!",
                          },
                        ]}
                      >
                        <Input placeholder="Enter the Area Name" size="large" />
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

export default AddArea;
